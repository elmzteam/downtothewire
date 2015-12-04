var sprintf = require("sprintf");

module.exports = function(handlebars) {

	handlebars.registerHelper("noop", function(options) {
		return ""
	})

	//	var tagColors = {
	//		"es6": "#fc2929",
	//		"life-changing": "#009800"
	//	}

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

	handlebars.registerHelper("tag", function(tag, options) {
		console.warn(tag);
		return new handlebars.SafeString(
			sprintf("<a class='tag' href='/tags/%s' style='background-color: %s;'>%s</a>", tag, hashStringToColor(tag), tag)
		);
	})

	return handlebars
}
