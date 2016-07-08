"use strict";

var sprintf     = require("sprintf")
var moment      = require("moment")
var path        = require("path")
var fs          = require("fs")
var RSS         = require("rss")
var config      = require("../config")
var logger      = require("./logger")
var md          = require("./markdown")

var POST_BREAK_REGEX = /\n\^{3,}\n/;

module.exports = function(handlebars, root) {
	handlebars.registerHelper("noop", function(options) {
		return ""
	})

	/**
		* Helper Functions
	**/

	//String Manipulation Methods
	function djb2(str){
		var hash = 0xc0ffee
		for (var i = 0; i < str.length; i++) {
			hash = ((hash << 5) + hash) + str.charCodeAt(i) /* hash * 33 + c */
		}
		return hash
	}

	function hashStringToColor(str) {
		var hash = djb2(str)
		var r = (hash & 0xFF0000) >> 16
		var g = (hash & 0x00FF00) >> 8
		var b = hash & 0x0000FF
		return "#" + ("0" + r.toString(16)).substr(-2) + ("0" + g.toString(16)).substr(-2) + ("0" + b.toString(16)).substr(-2)
	}

	//String Manipulation Helpers
	handlebars.registerHelper("formatTime", function(time) {
		return new handlebars.SafeString(moment(time).format("MMMM Do, YYYY"))
	})

	handlebars.registerHelper("tag", function(tag, options) {
		return new handlebars.SafeString(
			sprintf("<a class='tag' href='/tag/%s' style='background-color: %s;'>%s</a>", tag, hashStringToColor(tag), tag)
		)
	})

	handlebars.registerHelper("markdown", function(content) {
		return new handlebars.SafeString(md.render(content));
	});

	handlebars.registerHelper("short", function(content) {
		return content.split(POST_BREAK_REGEX)[0];
	});

	handlebars.registerHelper("full", function(content) {
		return content.replace(POST_BREAK_REGEX, "");
	});

	//Handlebars Utilities
	handlebars.registerHelper("and", function(b1, b2) {
		return b1 && b2
	})
	handlebars.registerHelper("not", function(b1) {
		return !b1
	})
	handlebars.registerHelper("or", function(b1, b2) {
		return b1 || b2
	})
	handlebars.registerHelper("eq", function(a, b) {
		return a === b
	})

	handlebars.registerHelper("log", function(val) {
		console.log(val)
		return ""
	})



	return handlebars
}
