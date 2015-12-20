var fs     = require("fs")
var Path   = require("path")

var DEBUG  = process.env.DEBUG ? true : false
var root   = DEBUG ? "/client/tmp/" : "/client/"
var path   = Path.join(root, "/hbs/")
var render = Path.join(root, "/render/")

var logger = require("./logger")
var wait   = require("wait.for")
var deasync= require("deasync")

var getTags;
var getPosts;

var compileRoutes = function(db) {
	var obj = {}
	obj.routes = {
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
		},
		"^/tags/([a-z0-9]+)$": {
			page: "page.hbs",
			cache: true,
			groups: ["currtag"]
		},
		"^/posts/([0-9]{13})$": {
			page: "post.hbs",
			cache: true,
			groups: ["post"]
		},
	}
	obj.prerender = [
		{path: "/", options: null},
		{path: "/page/{0}", options: {groups: [
			{
				range: {start: 0, end: 5}
			}
		]}},
		{path: "/tags/{0}", options: {groups: [
			{
				each: getTags(db) 
			}
		]}},
		{path: "/posts/{0}", options: {groups: [
			{
				each: getPosts(db)
			}
		]}}
	]
	return obj
}

module.exports = function(__dirname, handlebars, db) {
	var obj = compileRoutes(db)
	var cl = new renderer(__dirname, handlebars, obj)
	return {
		handle: function(req, res, next) {
			cl.handle(req, res, next)
		},
		reload: function() {
			cl.renderAll()
		}
	}
}

var renderer = function(__dirname, handlebars, obj) {
	this.__dirname = __dirname
	this.handlebars = handlebars
	this.routes = obj.routes
	this.prerender = obj.prerender
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
		for (var p in this.prerender) {
			if (!this.prerender[p].options || !this.prerender[p].options.groups) {
				promises.push(this.renderPage(this.prerender[p].path))
			} else {
				var groups = this.prerender[p].options.groups
				for (var i in groups) {
					if (groups[i].range) {
						for (var l = groups[i].range.start; l <= groups[i].range.end; l += 1) {
							var r = new RegExp("\\{"+i+"\\}","g")
							var url = this.prerender[p].path.replace(r, l)
							promises.push(this.renderPage(url))
						}
					}
					if (groups[i].each) {
						for (var l = 0; l < groups[i].each.length; l++) {
							var r = new RegExp("\\{"+i+"\\}","g")
							var url = this.prerender[p].path.replace(r, groups[i].each[l])
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
		for (var i in this.routes) {
			var m = url.match(i)
			if (m) {
				var context = this.routes[i]
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
		for (var i in this.routes) {
			var m = req.originalUrl.match(i)
			if (m && req.method == "GET") {
				var context = this.routes[i]
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

var getTags = function(db) {
	return deasync(function(cb) {
		db.posts.distinct("tags", {}, function(err, data) {
			cb(err, data)
		})
	})()
}

var getPosts = function(db) {
	return deasync(function(cb) {
		db.posts.distinct("timestamp", {}, function(err, data) {
			cb(err, data)
		})
	})()
}
