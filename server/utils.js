//Probably should move more stuff into here
/* global db */

const shortid   = require("shortid")
// const logger    = require("./logger")
const denodeify = require("denodeify")
const _fs       = require("fs")

const fs = {
	mkdir: denodeify(_fs.mkdir),
	readdir: denodeify(_fs.readdir),
	readFile: denodeify(_fs.readFile),
	rmdir: denodeify(_fs.rmdir),
	unlink: denodeify(_fs.unlink),
	writeFile: denodeify(_fs.writeFile),
	rename: denodeify(_fs.rename),
	realpath: denodeify(_fs.realpath),
	stat: denodeify(_fs.stat)
}

const slugify = function(str) {
	str = str.replace(/[ \t\n_]+/g, "_")
	str = str.replace(/[^\w_]+/g, "")
	return str.toLowerCase()
}

//Recursive promises, weeee....
const generateId = function(collection) {
	const id = shortid.generate()
	return collection.findOne({ guid: id }).then((data) => (data ? generateId(db) : id))
}

module.exports = {
	slugify: slugify,
	generateId: generateId,
	fs: fs
}
