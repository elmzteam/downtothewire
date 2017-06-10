#!/usr/bin/env node

const denodeify = require("denodeify")
const _fs       = require("fs")
const path      = require("path")
const pm        = require("promised-mongo")

const db        = pm("mongodb://localhost/bydesign", ["authors", "posts"])

const fs = { readFile: denodeify(_fs.readFile) }

console.log("Starting...")

db.posts.find({})
	.then((posts) =>
		Promise.all(posts.map((post) => {
			console.log(`Reading ${post.title.text}...`)
			return fs.readFile(path.join(__dirname, `../posts/${post.guid}.md`))
				.then((content) => {
					console.log(`Updating ${post.title.text}.`)
					return db.posts.update({ guid: post.guid }, { $set: { content: content.toString() } })
				})
		})))
	.then(() => process.exit(0))
	.catch((e) => console.error(e))
