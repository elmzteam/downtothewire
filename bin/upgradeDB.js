#!/usr/bin/env node
"use strict"

const mongojs = require("mongojs")
const db      = mongojs("mongodb://localhost/bydesign", ["authors", "posts"])
const fs      = require("fs")
const utils   = require("../server/utils")

const upgradeFiles = () => {
	const promises = []
	fs.readdir(`${__dirname}/../posts`, (e, data) => {
		if (e) return console.error("Could not upgrade", e)
		for (const datum of data) {
			const match = datum.match(/(.*)\.md/)
			if (!match) {
				console.log(`Skipping ${datum}`)
				continue
			}
			promises.push(new Promise((resolve) => {
				db.posts.find({ "timestamp": parseInt(match[1]) }, (e, data) => {
					if (e || data.length !== 1) {
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

const upgradeDB = () => {
	const promises = []
	db.posts.find({}, function(e, data) {
		if (e) return console.error("Could not upgrade", e)
		for (const datum of data) {
			if (!datum.slug) {
				datum.slug = utils.slugify(datum.title.text)
			}
			(function(datum) {
				promises.push(new Promise(function(resolve) {
					if (datum.guid) return resolve()
					utils.generateId(db.posts).then(function(id) {
						datum.guid = id
						datum.title.url = `/posts/${id}`
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

upgradeDB()
