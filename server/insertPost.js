#!/usr/bin/env node

"use strict"

const fs       = require("fs")
const path     = require("path")
const config   = require("../config")
// const shortid  = require("shortid")
// const utils    = require("./utils")
const logger   = require("./logger")

let prompt
const globals = {}
globals.coll = undefined
globals.path = undefined

const denodeify = function(fn, args, alt, th) {
	return new Promise(function(resolve, reject) {
		args[args.length] = (function(err, data) {
			if (err) {
				reject(err || "No Data")
			} else {
				resolve(alt ? alt(data) : data)
			}
		})
		try {
			fn.apply(th, args)
		} catch (e) {
			reject(e)
		}
	})
}

const fetchData = function() {
	return denodeify(prompt.get, [["author", "title", "tags", "content"]])
}

const crash = function(a) {
	logger.error(a)
}

const tagCheck = function(tags) {
	const re = /^[-a-z0-9]{1,16}$/
	for (let t = 0; t < tags.length; t++) {
		if (!re.test(tags[t])) {
			tags.splice(t, 1)
			t--
		}
	}
	return tags
}

const parseData = function(data) {
	return new Promise((resolve) => {
		const time = Date.now()
		const out = {
			db: {
				title: {
					text: data.title,
					url: `/posts/${time}`
				},
				author: data.author,
				tags: data.tags.split(" "),
				timestamp: time,
				visible: true
			},
			content: { address: data.content }
		}
		resolve(out)
	})
}

const getFile = function(data) {
	return denodeify(fs.readFile, [path.join(process.cwd(), data.content.address)], (content) => {
		data.content.value = content.toString()
		return data
	})
}

const writeFile = function(data) {
	// eslint-disable-next-line no-console
	console.log(data.db.guid)
	return denodeify(fs.writeFile,
		[path.join(config.paths.posts,`${data.db.guid}.md`), data.content.value],
		() => data
	)
}

const saveDatabase = function(data) {
	data.db.tags = tagCheck(data.db.tags)
	return denodeify(globals.coll.insert, [data.db], undefined, globals.coll)
}

const updateDatabase = function(data) {
	data.db.tags = tagCheck(data.db.tags)
	return denodeify(globals.coll.update, [{ guid: data.db.guid }, { $set: data.db }], undefined, globals.coll)
}

const insertPost = function(data, coll, path, update) {
	globals.path = path
	globals.coll = coll
	return writeFile(data).then((val) => {
		if (update) {
			return updateDatabase(val)
		} else {
			return saveDatabase(val)
		}
	}, crash)
}

// const getData = function() {
// 	return fetchData().then(parseData)
// }

module.exports = (db, path) =>
	((coll, path) => (data, update) => insertPost(data, coll, path, update).catch(crash))(db.posts, path)

if (!module.parent) {
	// eslint-disable-next-line global-require
	prompt = require("prompt")
	prompt.start()
	prompt.colors = false
	// eslint-disable-next-line global-require
	const mongojs = require("mongojs")
	const db = mongojs("mongodb://localhost/bydesign", ["posts"])
	fetchData()
		.then(parseData, crash)
		.then(getFile, crash)
		.then(module.exports(db, path.join(__dirname, "..", "client")), crash)
		.then(() => {
			// eslint-disable-next-line no-console
			console.log("Finished")
			return Promise.resolve("done")
		})
		.catch(crash)
}

