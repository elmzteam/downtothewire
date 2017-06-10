"use strict"

function fail(res, msg) {
	res.status(503)
	res.send(msg)
}

function prep(res) {
	return function(data) {
		res.type("application/json")
		res.send(data)
	}
}

function denodeify(fn, args, alt, th) {
	return new Promise(function(resolve, reject) {
		args[args.length] = (function(err, data) {
			if (err) {
				reject(err || "No Data")
			} else {
				resolve(alt ? alt(data) : data)
			}
		})
		fn.apply(th, args)
	})
}

function apiHandler(db) {
	this.db = db
}

apiHandler.prototype = {
	handle: function(req, res, next) {
		const match = req.originalUrl.match(/\/api\/([a-z0-9]+)\/([a-z0-9]+)/)
		if (match) {
			let out
			if (match[1] === "get") {
				out = this.meta(match[2]).then(prep(res))
			} else if (match[1] === "recent") {
				out = this.recent(match[2]).then(prep(res))
			} else if (match[1] === "author") {
				out = this.author(match[2]).then(prep(res))
			} else if (match[1] === "post") {
				out = this.post(match[2]).then(prep(res))
			} else {
				fail(res, "Unknown Option")
				return
			}
			out.catch(function(err) {
				fail(res, err)
			})
		} else {
			next()
		}
	},
	meta: function(val) {
		if (val === "authors") {
			return denodeify(this.db.authors.find, [{}, {
				"id": 1,
				"displayName": 1,
				"_id": 0
			}], JSON.stringify, this.db.authors)
		} else {
			return Promise.reject("Invalid Option")
		}
	},
	recent: function(num) {
		num = parseInt(num)
		if (isNaN(num)) return Promise.reject("Not an Integer")
		const cursor = this.db.posts.find({}, { "_id": 0 }).sort({ "timestamp": -1 }).limit(num)
		return denodeify(cursor.map, [function(doc) {
			return doc.guid
		}], JSON.stringify, cursor)
	},
	author: function(author) {
		const cursor = this.db.posts.find({ author: author }, { "_id": 0 }).sort({ "timestamp": -1 })
		return denodeify(cursor.map, [function(doc) {
			return doc.guid
		}], JSON.stringify, cursor)
	},
	post: function(id) {
		return denodeify(this.db.posts.find, [{ guid: id }, { "_id": 0 }], JSON.stringify, this.db.posts)
	}
}

module.exports = function(db) {
	const handle = new apiHandler(db)
	return (function(handle) {
		return function() {
			handle.handle.apply(handle, arguments)
		}
	})(handle)
}
