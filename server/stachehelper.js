module.exports = function(handlebars) {

	handlebars.registerHelper("noop", function(options) {
		return ""
	})

	return handlebars
}
