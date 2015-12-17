var fs     = require("fs")
var Path   = require("path")

var DEBUG  = process.env.DEBUG ? true : false
var root   = DEBUG ? "/client/tmp/" : "/client/"
var path   = Path.join(root, "/hbs/")
var render = Path.join(root, "/render/")

var logger = require("./logger")
var wait   = require("wait.for")

var Fiber = require("fibers")

if (!DEBUG) {
	var routes = {
		"^/$": {
			page: "page.hbs",
			cache: true,
			index: 0,
		},
		"^/page/([0-9]+)$": {
			page: "page.hbs",
			cache: true,
			groups: ["index"]
		},
		"^/editor/?([0-9]*)$": {
			page: "upload.hbs",
			cache: false,
			groups: ["content"]
		}
	}
	var prerender = [
		{path: "/", options: null},
		{path: "/page/{0}", options: {groups: [
			{
				range: {start: 0, end: 5}
			}
		]}},
	]
} else {
	var routes = {
		"^/$": {page: "index.html", index: 0, cache: true}, 
		"^/page/([0-9]+)$": {page: "index.html", groups: ["index"], cache: true},
		"^/userinfo$": {page: "user.html", cache: false},
	}
	var prerender = [
		{path: "/", options: null},
		{path: "/userinfo", options: null},
		{path: "/page/{0}", options: {groups: [
			{
				range: {start:1, end: 9}
			}
		]}},
	]
}

module.exports = function(__dirname, handlebars) {
	var cl = new renderer(__dirname, handlebars)
	return (function(obj) {
		return function(req, res, next) {
			obj.handle(req, res, next)
		}
	})(cl)
}

var renderer = function(__dirname, handlebars) {
	this.__dirname = __dirname
	this.handlebars = handlebars
	this.templates = {}
	this.compiled = {}
	this.rendered = {}
	var that = this;
	var comp = function() {
		that.compileAll().then(function(a) {
			return that.renderAll() 
		}).catch(crash)
	}
	comp()
}

renderer.prototype = {
	renderPath:function(context) {
		return this.compiled[context.page](context)
	},
	compileAll: function() {
		var that = this
		return new Promise(function(resolve, reject) {
			that.readFiles().then(function(templates) {
				that.templates = {}
				that.compiled = {}
				for (var i = 0; i < templates.length; i++) {
					that.templates[templates[i].name] = templates[i].data
					that.handlebars.registerPartial(templates[i].name, templates[i].data)
				}
				for (var i = 0; i < templates.length; i++) {
					that.compiled[templates[i].name] = that.handlebars.compile(templates[i].data)
				}
				resolve(that.compiled)
			}, crash)
		})
	},
	readFiles: function() {
		var that = this
		return new Promise(function(resolve, reject) {
			fs.readdir(Path.join(that.__dirname,path),  function(err, files) {
				if (err) {
					crash(err)
					return
				}
				var promises = []
				for (var i = 0; i < files.length; i++) {
					promises.push(promiseFile(that.__dirname+path, files[i]))
				}
				Promise.all(promises).then(resolve, reject)
			})
		})
	},
	renderAll: function() {
		var promises = []
		for (var p in prerender) {
			if (!prerender[p].options || !prerender[p].options.groups) {
				promises.push(this.renderPage(prerender[p].path))
			} else {
				var groups = prerender[p].options.groups
				for (var i in groups) {
					if (groups[i].range) {
						for (var l = groups[i].range.start; l <= groups[i].range.end; l += 1) {
							var r = new RegExp("\\{"+i+"\\}","g")
							var url = prerender[p].path.replace(r, l)
							promises.push(this.renderPage(url))
						}
					}
				}
			}
		}
		return Promise.all(promises)
	},
	renderPage: function(url) {
		logger.info("[render]", url);
		var loc = Path.join(this.__dirname, render)
		for (var i in routes) {
			var m = url.match(i)
			if (m) {
				var context = routes[i]
				if (context.cache === false) {
					return new Promise(function (resolve, reject) {resolve()})	
				}
				for (var ind = 1; ind < m.length; ind++) {
					if (context.groups && (ind-1) < context.groups.length) {
						context[context.groups[ind-1]] = m[ind]
					}
				}
				var out = this.renderPath(context)
				var written = "ROOT"+url.replace(/\//g,".")
				return denodeify(fs.writeFile, [Path.join(loc, written), out])
			}
		}
	},
	handle: function(req, res, next) {
		for (var i in routes) {
			var m = req.originalUrl.match(i)
			if (m && req.method == "GET") {
				var context = routes[i]
				if (context.cache === true) {
					var written = "ROOT"+req.originalUrl.replace(/\//g,".")
					res.type("html")
					res.sendFile(written, {root: Path.join(this.__dirname, render)})
					return;
				} else {
					for (var ind = 1; ind < m.length; ind++) {
						if (context.groups && (ind-1) < context.groups.length) {
							context[context.groups[ind-1]] = m[ind]
						}
					}
					if (req.user) context.user = req.user
					var out = this.renderPath(context)
					res.send(out)
					return;
				}
			}
		}
		next()
	}
}

var crash = function(err) {
	logger.error(err.stack)
}

var promiseFile = function(path, filename) {
	logger.info("[file-request]", path, filename)
	return new Promise(function(res, rej) {
		fs.readFile(Path.join(path,filename), function(err, file) {
			if (err) rej(err)
			else res({name: filename, data: file.toString()})
		})
	})
}

var denodeify = function(fn, args) {
	return new Promise(function(resolve, reject) {
		args[args.length] = (function(err, data) {
			if (err || data == undefined) reject(err || "No Data")
			else resolve(data)
		})
		fn.apply(fn,args)
	})
}
