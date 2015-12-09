var sprintf = require("sprintf")
var deasync = require("deasync")
var moment  = require("moment")
var Path    = require("path")
var marked  = require("marked")
var fs      = require("fs")

module.exports = function(handlebars, db, root) {

	handlebars.registerHelper("noop", function(options) {
		return ""
	})

	function djb2(str){
		var hash = 0xc0ffee;
		for (var i = 0; i < str.length; i++) {
			hash = ((hash << 5) + hash) + str.charCodeAt(i); /* hash * 33 + c */
		}
		return hash;
	}

	function hashStringToColor(str) {
		var hash = djb2(str);
		var r = (hash & 0xFF0000) >> 16;
		var g = (hash & 0x00FF00) >> 8;
		var b = hash & 0x0000FF;
		return "#" + ("0" + r.toString(16)).substr(-2) + ("0" + g.toString(16)).substr(-2) + ("0" + b.toString(16)).substr(-2);
	}

	function getUser(id, cb) {
		db.authors.findOne({id: id}, function(err, data) {
			cb(err,data);
		})
	}

	function getPosts(start, end, cb) {
		db.posts.find().sort({timestamp: 1}).skip(start).limit(end-start, function(err, data) {
			cb(err, data);
		})
	}

	function getContent(id, cb) {
		fs.readFile(Path.join(root, "posts", id+".md"), function(err, data) {
			cb(err, data);
		})
	}

	handlebars.registerHelper("loadcontent", function(id) {
		var out = deasync(getContent)(id)
		if (out) {
			return marked(out.toString());
		} else {
			return "Error"
		}
	})
	handlebars.registerHelper("author", function(id) {
		return deasync(getUser)(id)
	})

	handlebars.registerHelper("posts", function(start, end) {
		return deasync(getPosts)(start, end)
	})

	handlebars.registerHelper("longtime", function(time) {
		return new handlebars.SafeString(moment(time).format("MMMM Do, YYYY"))
	})

	handlebars.registerHelper("tag", function(tag, options) {
		return new handlebars.SafeString(
			sprintf("<a class='tag' href='/tags/%s' style='background-color: %s;'>%s</a>", tag, hashStringToColor(tag), tag)
		);
	})

	return handlebars
}
