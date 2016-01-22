"use strict";

var fs              = require("fs")
var path            = require("path")

var config          = require("../config")
var logger          = require("./logger")
var wait            = require("wait.for")
var deasync         = require("deasync")
var extend          = require("extend")

var TEMPLATES_DIR   = path.join(config.paths.client, "/hbs/")

var RENDER_ROOT_STR = "@"

var getTags
var getPosts

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
		"^/editor(/([0-9]*))?$": {
			page: "editor.hbs",
			cache: false,
			groups: ["null", "content"]
		},
		"^/tags/([a-z0-9\-]{1,16})$": {
			page: "page.hbs",
			cache: true,
			groups: ["currtag"]
		},
		"^/posts/([0-9]{13})$": {
			page: "page.hbs",
			cache: true,
			groups: ["post"],
			single: true
		},
		"^/preview/([0-9]{13})$": {
			page: "page.hbs",
			cache: false,
			groups: ["post"],
			single: true,
			restricted: true,
		},
		"^/raw/([0-9]{13})$": {
			page: "raw.hbs",
			cache: true,
			groups: ["post"]
		},
		"^/admin/?$": {
			page: "admin.hbs",
			cache: false,
		},
		"^/rss/?$": {
			page: "rss.hbs",
			cache: true,
			mime: "text/xml"
		},
		"^/contact/?$":  {
			page: "single.hbs",
			cache: true,
			contact: true
		},
		"^/about/?$":  {
			page: "single.hbs",
			cache: true,
			about: true
		},
		"^/404$": {
			page: "single.hbs",
			cache: true,
			fourohfour: true
		}
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
		]}},
		{path: "/raw/{0}", options: {groups: [
			{
				each: getPosts(db)
			}
		]}},
		{path: "/rss{0}", options: {groups: [
			{
				each: ["","/"]
			}
		],
		}},
		{path: "/contact{0}", options: {groups: [
			{
				each: ["","/"]
			}
		],
		}},
		{path: "/about{0}", options: {groups: [
			{
				each: ["","/"]
			}
		],
		}},
		{path: "/404", options: null}
	]
	return obj
}

module.exports = function(__dirname, handlebars, db) {
	var cl = new renderer(__dirname, handlebars, db)
	return {
		handle: function(req, res, next) {
			cl.handle(req, res, next)
		},
		reload: function() {
			cl.clearCache().then(function() {
				cl.renderAll()
			}).catch(crash)
		},
		fourohfour: function(req, res, next) {
			cl.fourohfour(req, res, next)
		}
	}
}

var renderer = function(__dirname, handlebars, db) {
	this.__dirname = __dirname
	this.handlebars = handlebars
	this.db = db
	this.templates = {}
	this.compiled = {}
	this.rendered = {}
	var that = this
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
	clearCache: function() {
		var that = this
		return denodeify(fs.readdir, [path.join(that.__dirname,config.paths.render)]).then(function(files) {
			var regex = new RegExp("^" + RENDER_ROOT_STR + ".*$")
			var promises = []
			for (var i = 0; i < files.length; i++) {
				if (files[i].match(regex)) {
					logger.info("[render] Clearing "+files[i])
					promises.push(
						denodeify(fs.unlink, [path.join(that.__dirname, config.paths.render, files[i])])
					)
				}
			}
			return Promise.all(promises)
		})
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
					that.compiled[templates[i].name] = that.handlebars.compile(templates[i].data, {
						preventIndent: true,
					})
				}
				resolve(that.compiled)
			}, crash)
		})
	},
	readFiles: function() {
		var that = this
		return new Promise(function(resolve, reject) {
			fs.readdir(path.join(that.__dirname,TEMPLATES_DIR),  function(err, files) {
				if (err) {
					crash(err)
					return
				}
				var promises = []
				for (var i = 0; i < files.length; i++) {
					promises.push(promiseFile(path.join(that.__dirname, TEMPLATES_DIR), files[i]))
				}
				Promise.all(promises).then(resolve, reject)
			})
		})
	},
	renderAll: function() {
		var obj = compileRoutes(this.db)
		this.routes = obj.routes
		this.prerender = obj.prerender
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
		logger.info("[render]", "Rendering", url)
		var loc = path.join(this.__dirname, config.paths.render)
		for (var i in this.routes) {
			var m = url.match(i)
			if (m) {
				var context = extend(true, {}, this.routes[i])
				if (context.cache === false) {
					return new Promise(function (resolve, reject) {resolve()})	
				}
				for (var ind = 1; ind < m.length; ind++) {
					if (context.groups && (ind-1) < context.groups.length) {
						context[context.groups[ind-1]] = m[ind]
					}
				}
				var out = this.renderPath(context)
				var written = RENDER_ROOT_STR + url.replace(/\//g,".")
				logger.info("[render]", "Caching", url)
				return denodeify(fs.writeFile, [path.join(loc, written), out])
			}
		}
	},
	handle: function(req, res, next) {
		var that = this;
		for (var i in this.routes) {
			var m = req.originalUrl.match(i)
			if (m && req.method == "GET") {
				var context = extend(true, {}, this.routes[i])
				if (context.cache === true) {
					var written = RENDER_ROOT_STR + req.originalUrl.replace(/\//g,".")
					res.type(context.mime || "text/html")
					promiseFile(path.join(this.__dirname, config.paths.render), written).then(function(val) {
						res.send(val.data)
					}, function(err) {
						that.fourohfour(req, res, next)
					}).catch(crash)
					return 
				} else {
					for (var ind = 1; ind < m.length; ind++) {
						if (context.groups && (ind-1) < context.groups.length) {
							context[context.groups[ind-1]] = m[ind]
						}
					}
					if (req.user) context.user = req.user
					var out = this.renderPath(context)
					res.send(out)
					return
				}
			}
		}
		next()
	},
	fourohfour: function(req, res, next) {
		var loc = path.join(this.__dirname, config.paths.render)
		//Inelegent, but best I could come up with in my tired state
		promiseFile(loc, RENDER_ROOT_STR+".404").then(function(file) {
			res.status(404)
			res.send(file.data)
		}).catch(function(err) {
			res.status(666) // this is not a valid http code.  please resubmit.
			logger.error("[error]", "Error:", err)
			res.send("Error Recursion too deep. Please brace for the apocalypse.")
		}).catch(crash)
	}
}

var crash = function(err) {
	logger.error(err.stack || err)
}

var promiseFile = function(dir, filename) {
	logger.info("[file-request]", dir, filename)
	return new Promise(function(resolve, reject) {
		fs.readFile(path.join(dir, filename), function(err, file) {
			if (err) {
				console.log("error")
				reject(err)
			} else {
				resolve({name: filename, data: file.toString()})
			}
		})
	})
}

var denodeify = function(fn, args) {
	return new Promise(function(resolve, reject) {
		args[args.length] = (function(err, data) {
			if (err) reject(err || "No Data")
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

var getPosts = function(db, all) {
	return deasync(function(cb) {
		var query = {}
		if (!all) query.visible = true
		db.posts.distinct("timestamp", query, function(err, data) {
			cb(err, data)
		})
	})()
}
