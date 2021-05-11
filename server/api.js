"use strict";

const users = require("../users");

module.exports = function(db) {
	var handle = new apiHandler(db)
	return (function(handle) {
		return function() {
			handle.handle.apply(handle, arguments)
		}
	})(handle)
}

var apiHandler = function(db) {
	this.db = db
}

apiHandler.prototype = {
	handle:
	function(req, res, next) {
		var match = req.originalUrl.match(/\/api\/([a-z0-9]+)\/([a-zA-Z0-9_]+)/)
		if (match) {
			var out
			if (match[1] == "get") {
				out = this.meta(match[2]).then(prep(res))
			} else if (match[1] == "recent") {
				out = this.recent(match[2]).then(prep(res))
			} else if (match[1] == "author") {
				out = this.author(match[2]).then(prep(res))
			} else if (match[1] == "post") {
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
	meta:
	function(val) {
		if (val == "authors") {
			return Promise.resolve(
				Object.values(users)
					.map(({ name, handle, bio }) => ({ name, handle, bio }))
			);
		} else {
			return Promise.reject("Invalid Option")
		}
	},
	recent:
	function(num) {
		num = parseInt(num)
		if (isNaN(num)) return Promise.reject("Not an Integer")
		return this.db.posts
			.find({})
			.skip(num * 10)
			.limit(10)
			.sort({ timestamp: -1 })
			.map(filterPost)
			.toArray();
	},
	author:
	function(author) {
		const user = Object.values(users).find(({ handle }) => handle === author);
		if (user === undefined) {
			return Promise.reject("Author not found");
		}
		return this.db.posts
			.find({ author: user.gid, visible: true })
			.sort({ timestamp: -1 })
			.map(filterPost)
			.toArray();
	},
	post:
	function(id) {
		return this.db.posts
			.find({ guid: id }, { _id: 0 })
			.map(filterPost)
			.toArray();
	}
}

const filterPost = ({ timestamp, guid, title, slug, content }) => ({ timestamp, guid, title, slug, content });

var fail = function(res, msg) {
	res.status(503)
	res.send(msg)
}

var prep = (res) => (data) => res.json(data);
