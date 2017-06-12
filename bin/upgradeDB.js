#!/usr/bin/env node
"use strict"

const mongojs = require("mongojs")
const db      = mongojs("mongodb://localhost/bydesign", ["authors", "posts"])
const fs      = require("fs")
const path    = require("path")
const utils   = require("../server/utils")

const ROOT_DIR = path.join(__dirname, "..")
const POSTS_DIR = path.join(ROOT_DIR, "posts")

function upgradeFiles() {
	const promises = []
	fs.readdir(POSTS_DIR, (e, data) => {
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
					fs.rename(path.join(POSTS_DIR, datum),
						path.join(POSTS_DIR, `${data[0].guid}.md`), () => {
							console.log(`Renamed "${datum}" to "${data[0].guid}.md"`)
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

function upgradeDB() {
	const promises = []
	db.posts.find({}, (e, data) => {
		if (e) return console.error("Could not upgrade", e)
		for (const datum of data) {
			if (!datum.slug) {
				datum.slug = utils.slugify(datum.title.text)
			}
			((datum) => {
				promises.push(new Promise((resolve) => {
					if (datum.guid) return resolve()
					utils.generateId(db.posts).then((id) => {
						datum.guid = id
						datum.title.url = `/posts/${id}`
						db.posts.save(datum, (e, d) => {
							console.log("Updating: ", datum.slug)
							resolve(d)
						})
					})
				}))
			})(datum)
		}
		Promise.all(promises)
			.then(() => upgradeFiles())
			.catch(console.error)
	})
}

upgradeDB()
