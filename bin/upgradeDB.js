#!/usr/bin/env node
var utils = require("../server/utils") 
var mongojs     = require("mongojs")
var db          = mongojs("mongodb://localhost/bydesign",["authors", "posts"])

promises = []

db.posts.find({}, function(e, data) {
	if (e) return console.error("Could not upgrade", e)
	for (var datum of data) {
		if (!datum.slug) {
			datum.slug = utils.slugify(datum.title.text)
		}
		(function(datum) {
			promises.push(new Promise(function(resolve, reject) {
				utils.generateId(db.posts).then(function(id) {
					datum.guid = id
					db.posts.save(datum, function(e, d) {
						console.log("Updating: ", datum.slug)
						resolve(d)	
					})
				})
			}))
		})(datum)
	}
	Promise.all(promises).then(function() {
		console.log("Done")
		process.exit()
	})
})
