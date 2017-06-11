"use strict"

const denodeify = require("denodeify")

function fail(res, msg) {
	res.status(503)
	res.send(msg)
}

const prep = (res) => (data) => {
	res.type("application/json")
	res.send(data)
}

class ApiHandler {
	constructor(db) {
		this.db = db
	}

	handle(req, res, next) {
		const match = req.originalUrl.match(/\/api\/([a-z0-9]+)\/([a-z0-9]+)/)
		if (!match) {
			next()
			return
		}
		let route = this.routes[match[1]]
		if (route === undefined) {
			fail(res, "Unknown Option")
			return
		}
		route(match[2])
			.then(prep(res))
			.catch((err) => fail(res, err))
	}

	meta(val) {
		if (val === "authors") {
			return denodeify(this.db.authors.find, [{}, {
				"id": 1,
				"displayName": 1,
				"_id": 0
			}], JSON.stringify, this.db.authors)
		} else {
			return Promise.reject("Invalid Option")
		}
	}
	recent(num) {
		num = parseInt(num)
		if (isNaN(num)) return Promise.reject("Not an Integer")
		const cursor = this.db.posts.find({}, { "_id": 0 }).sort({ "timestamp": -1 }).limit(num)
		return denodeify(cursor.map, [(doc) => doc.guid], JSON.stringify, cursor)
	}
	author(author) {
		const cursor = this.db.posts.find({ author: author }, { "_id": 0 }).sort({ "timestamp": -1 })
		return denodeify(cursor.map, [(doc) => doc.guid], JSON.stringify, cursor)
	}
	post(id) {
		return denodeify(this.db.posts.find, [{ guid: id }, { "_id": 0 }], JSON.stringify, this.db.posts)
	}
}

ApiHandler.routes = Object.freeze({
	get: ApiHandler.meta,
	recent: ApiHandler.recent,
	author: ApiHandler.author,
	post: ApiHandler.post
})

module.exports = ApiHandler
