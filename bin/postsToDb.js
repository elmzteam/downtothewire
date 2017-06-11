#!/usr/bin/env node
"use strict"

const denodeify = require("denodeify")
const _fs       = require("fs")
const path      = require("path")
const pm        = require("promised-mongo")

const db        = pm("mongodb://localhost/bydesign", ["authors", "posts"])
const fs = { readFile: denodeify(_fs.readFile) }

const ROOT_DIR = path.join(__dirname, "..")
const POSTS_DIR = path.join(ROOT_DIR, "posts")

console.log("Starting...")

db.posts.find({})
	.then((posts) =>
		Promise.all(posts.map((post) => {
			console.log(`Reading ${post.title.text}...`)
			return fs.readFile(path.join(POSTS_DIR, `${post.guid}.md`))
				.then((content) => {
					console.log(`Updating ${post.title.text}.`)
					return db.posts.update({ guid: post.guid }, { $set: { content: content.toString() } })
				})
		})))
	.then(() => process.exit(0))
	.catch((e) => console.error(e))
