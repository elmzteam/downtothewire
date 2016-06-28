#!/usr/bin/env node
var utils = require("../server/utils") 
var fs = require("fs")
var mongojs     = require("mongojs")
var db          = mongojs("mongodb://localhost/bydesign",["authors", "posts"])


upgradeDB = () => {
	let promises = []
	db.posts.find({}, function(e, data) {
		if (e) return console.error("Could not upgrade", e)
		for (var datum of data) {
			if (!datum.slug) {
				datum.slug = utils.slugify(datum.title.text)
			}
			(function(datum) {
				promises.push(new Promise(function(resolve, reject) {
					if (datum.guid) return resolve()
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
			upgradeFiles()
		}).catch(console.error)
	})
}

upgradeFiles = () => {
	let promises = []
	fs.readdir(__dirname+"/../posts", (e, data) => {
		if (e) return console.error("Could not upgrade", e)
		for (let datum of data) {
			let match = datum.match(/(.*)\.md/)
			if (!match) {
				console.log(`Skipping ${datum}`)
				continue
			}
			promises.push(new Promise((resolve, reject) => {
				db.posts.find({"timestamp": parseInt(match[1])}, (e, data) => {
					if (e || data.length != 1) {
						console.log(`Unable to upgrade ${match[1]}`)
						resolve()
						return
					}
					fs.rename(`${__dirname}/../posts/${datum}`,
						  `${__dirname}/../posts/${data[0].guid}.md`, () => {
						console.log(`Renamed ${datum}`)
						resolve()
					})
				})
			}))
		}
		Promise.all(promises).then(() => {
			console.log("Done")
			process.exit(0)
		}).catch(console.error)
	})
}

upgradeDB()
