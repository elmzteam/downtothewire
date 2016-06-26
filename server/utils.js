//Probably should move more stuff into here

var shortid = require("shortid")
var logger = require("./logger")

var slugify = function(str) {
	str = str.replace(/[ \t\n_]+/g, "_")
	str = str.replace(/[^\w_]+/g, "")
	return str.toLowerCase()
}

//Recursive promises, weeee....
var generateId = function(db) {
	return new Promise(function(resolve, reject) {
		var id = shortid.generate()
		db.find({guid: id}, function(e, data) {
			if (data.length != 0 || e) {
				logger.error(arguments)
				resolve(generateId(db))
			} else {
				resolve(id)
			}
		})
	})
}

module.exports = {
	slugify: slugify,
	generateId: generateId,
}
