var sprintf		= require("sprintf")
var deasync		= require("deasync")
var moment		= require("moment")
var Path		= require("path")
var marked		= require("marked")
var fs			= require("fs")
var highlight	= require("node-syntaxhighlighter")


marked.setOptions({
	gfm: true,
	highlight: function(code, lang){
		return highlight.highlight(code, highlight.getLanguage(lang ? lang : "text"));
	},
})

module.exports = function(handlebars, db, root) {

	handlebars.registerHelper("noop", function(options) {
		return ""
	})
	
	/** 
	  * Helper Functions
	**/

	//String Manipulation Methods 
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

	//Database Access Functions
	function getUser(id, cb) {
		db.authors.findOne({id: id}, function(err, data) {
			cb(err,data);
		})
	}

	function getPosts(start, end, tag, cb) {
		var query = {}
		if (tag) query.tags = tag
		db.posts.find(query).sort({timestamp: -1}).skip(start).limit(end-start, function(err, data) {
			console.log(data);
			cb(err, data);
		})
	}

	function getTags(cb) {
		db.posts.distinct("tags", {}, function(err, data) {
			cb(err, data)
		})
	}

	function getContent(id, cb) {
		fs.readFile(Path.join(root, "posts", id+".md"), function(err, data) {
			cb(err, data);
		})
	}

	function getSize(cb) {
		db.posts.stats(function(err, res) {
			cb(null, res.count)
		})
	}

	function getPost(id, cb) {
		db.posts.findOne({timestamp: parseInt(id)}, function(err, data) {
			cb(err, data)
		})
	}

	//String Manipulation Helpers
	handlebars.registerHelper("expand", function(id) {
		return new handlebars.SafeString("<div class='expand'><a class='no-line' href='/posts/"+id+"'>Read More <i class='zmdi zmdi-long-arrow-right'></i></a></div>");
	})
	handlebars.registerHelper("abbreviate", function(content) {
		return content.split("<more>")[0]
	})

	handlebars.registerHelper("longtime", function(time) {
		return new handlebars.SafeString(moment(time).format("MMMM Do, YYYY"))
	})

	handlebars.registerHelper("tag", function(tag, options) {
		return new handlebars.SafeString(
			sprintf("<a class='tag' href='/tags/%s' style='background-color: %s;'>%s</a>", tag, hashStringToColor(tag), tag)
		);
	})

	//Database Access and Manipulation
	handlebars.registerHelper("loadcontent", function(id) {
		var out = deasync(getContent)(id)
		if (out) {
			return marked(out.toString());
		} else {
			return "Error"
		}
	})
	handlebars.registerHelper("tags", function() {
		return deasync(getTags)();	
	})

	handlebars.registerHelper("fetchcontent", function(id) {
		var out = deasync(getContent)(id)
		if (out) {
			return out.toString()
		} else {
			return "Error"
		}
	})
	handlebars.registerHelper("fetchpost", function(id) {
		var out = deasync(getPost)(id)
		if (out) {
			return out;
		} else {
			return {title: {text: "New Post"},
					tags: [],
				   }
		}
	})
	handlebars.registerHelper("getAuthorInfo", function(id) {
		return deasync(getUser)(id)._json
	})

	handlebars.registerHelper("posts", function(page, tag) {
		var val = parseInt(page)
		return deasync(getPosts)(val*5, (val+1)*5, tag)
	})

	handlebars.registerHelper("allPosts", function() {
		return deasync(getPosts)(0,0, undefined);
	})

	//Content Access (This is still gross)
	handlebars.registerHelper("sidebar", function() {
		return [{
			title: "About",
			content: "By Design is blog about the latest and greatest in development tools."
		}, {
			title: "Who",
			content: (new handlebars.SafeString("Contributors include <a href='zwad3.com'>Zachary Wade</a>, Matthew Savage, and others."))
		}]
	})
	
	//Handlebars Utilities
	handlebars.registerHelper("set", function(obj, key, val){
		obj[key] = val
	})

	handlebars.registerHelper("log", function(val) {
		console.log(val)
		return ""
	})

	handlebars.registerHelper("inc", function(ind) {
		return parseInt(ind) + 1;
	})

	handlebars.registerHelper("dec", function(ind) {
		return parseInt(ind) - 1; 
	})

	handlebars.registerHelper("atBottom", function(ind) {
		return parseInt(ind) >= Math.ceil(deasync(getSize)()/5)-1;
	})

	handlebars.registerHelper("atTop", function(ind) {
		return parseInt(ind) <= 0;
	})

	handlebars.registerHelper("notBottom", function(ind) {
		return parseInt(ind) <  Math.ceil(deasync(getSize)()/5)-1;
	})

	handlebars.registerHelper("notTop", function(ind) {
		return parseInt(ind) > 0;
	})

	return handlebars
}
