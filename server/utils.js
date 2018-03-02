//Probably should move more stuff into here

let shortid       = require("shortid")
let logger        = require("./logger")
let _fs           = require("fs")
let { promisify } = require("util")

const fs = {
	mkdir: promisify(_fs.mkdir),
	readdir: promisify(_fs.readdir),
	readFile: promisify(_fs.readFile),
	rmdir: promisify(_fs.rmdir),
	unlink: promisify(_fs.unlink),
	writeFile: promisify(_fs.writeFile),
	rename: promisify(_fs.rename),
	realpath: promisify(_fs.realpath),
	stat: promisify(_fs.stat),
}

var slugify = function(str) {
	str = str.replace(/[ \t\n_]+/g, "_")
	str = str.replace(/[^\w_]+/g, "")
	return str.toLowerCase()
}

//Recursive promises, weeee....
var generateId = function(collection) {
	let id = shortid.generate();
	return collection.findOne({guid: id}).then((data) => data ? generateId(db) : id);
}


module.exports = {
	slugify,
	generateId,
	fs,
}
