var fs         = require("fs")

var path = "/client/hbs/"

var routes = {
	"^/$": {page: "index.html", index: 0},
	"^/page/([0-9]+)$": {page: "index.html", groups: ["index"]}
}

module.exports = function(__dirname, handlebars) {
	var cl = new renderer(__dirname, handlebars);
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
	this.compileAll()
}

renderer.prototype = {
	renderPath: function(context) {
		return this.compiled[context.page](context);
	},
	compileAll: function() {
		var that = this
		this.readFiles().then(function(templates) {
			that.templates = {}
			that.compiled = {}
			for (var i = 0; i < templates.length; i++) {
				that.templates[templates[i].name] = templates[i].data
			}
			for (var i = 0; i < templates.length; i++) {
				that.compiled[templates[i].name] = that.handlebars.compile(templates[i].data)
			}
		}, crash)
	},
	readFiles: function() {
		var that = this
		return new Promise(function(resolve, reject) {
			fs.readdir(that.__dirname+path, function(err, files) {
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
	handle: function(req, res, next) {
		if (this.rendered[req.originalUrl]) {
			res.send(this.rendered[req.originalUrl])
			return
		}
		for (var i in routes) {
			var m = req.originalUrl.match(i)
			if (m) {
				var context = routes[i];
				for (var ind = 1; ind < m.length; ind++) {
					if (context.groups && (ind-1) < context.groups.length) {
						context[context.groups[ind-1]] = m[ind]
					}
				}
				console.log(context)
				this.rendered[req.originalUrl] = this.renderPath(context)
				res.send(this.rendered[req.originalUrl])
				return
			}
		}
		next()
	}
}

var crash = function(err) {
	console.error(err);
}

var promiseFile = function(path, filename) {
	return new Promise(function(res, rej) {
		fs.readFile(path+filename, function(err, file) {
			if (err) rej(err)
			else res({name: filename, data: file.toString()})
		})
	})
}
