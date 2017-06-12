"use strict"

const sprintf = require("sprintf")
const moment = require("moment")
// const path = require("path")
// const fs = require("fs")
// const config = require("../config")
// const logger = require("./logger")
const md = require("./markdown")

const POST_BREAK_REGEX = /\n\^{3,}\n/

module.exports = function(handlebars) {
	handlebars.registerHelper("noop", () => "")

	/**
	 * Helper Functions
	 **/

	//String Manipulation Methods
	function djb2(str) {
		let hash = 0xc0ffee
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) + hash) + str.charCodeAt(i) /* hash * 33 + c */
		}
		return hash
	}

	function hashStringToColor(str) {
		const hash = djb2(str)
		const rgb = [
			(hash & 0xFF0000) >> 16,
			(hash & 0x00FF00) >> 8,
			hash & 0x0000FF
		]
		return rgb.map((color) => (`0${color.toString(16)}`).substr(-2))
			.reduce((acc, hex) => acc + hex, "#")
	}

	//String Manipulation Helpers
	handlebars.registerHelper("formatTime", function(time) {
		return new handlebars.SafeString(moment(time).format("MMMM Do, YYYY"))
	})

	handlebars.registerHelper("tag", function(tag) {
		return new handlebars.SafeString(
			sprintf(
				"<a class='tag' href='/tag/%s' style='background-color: %s;'>%s</a>",
				tag,
				hashStringToColor(tag),
				tag
			)
		)
	})

	handlebars.registerHelper("markdown", function(content) {
		return new handlebars.SafeString(md.render(content))
	})

	handlebars.registerHelper("short", function(content) {
		return content.split(POST_BREAK_REGEX)[0]
	})

	handlebars.registerHelper("full", function(content) {
		return content.replace(POST_BREAK_REGEX, "")
	})

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
		// eslint-disable-next-line no-console
		console.log(val)
		return ""
	})


	return handlebars
}
