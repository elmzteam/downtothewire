var fs = require("fs")
var Path = require("path")

var prompt;
var globals  = {};
globals.coll = undefined;
globals.path = undefined;


var getData = function() {
	return fetchData().then(parseData)
}

var fetchData = function() {
	return denodeify(prompt.get, [['author', 'title', 'tags', 'content']])
}

var parseData = function(data) {
	return new Promise(function(resolve, reject) {
		var time = Date.now()
		var out = {
			db: {
				title: {
					text: data.title,
					url: "/posts/"+time,
				},
				author: data.author,
				tags: data.tags.split(" "),
				timestamp: time,
			},
			content: {
				address: data.content	
			}
		}
		resolve(out);
	})
}

var getFile = function(data) {
	return denodeify(fs.readFile, [Path.join(process.cwd(),data.content.address)], function(content) {
		data.content.value = content.toString();
		return data
	})
}

var writeFile = function(data) {
	return denodeify(fs.writeFile, [Path.join(globals.path, "/posts/", data.db.timestamp+".md"), data.content.value], function() {
		return data;
	})
}

var saveDatabase = function(data) {
	console.log(globals.coll._getServer)
	globals.coll.fn = function() {
		console.log(this)
	}
	return denodeify(globals.coll.insert, [data.db], undefined, globals.coll);
}

var updateDatabase = function(data) {
	return denodeify(globals.coll.update, [{timestamp: data.db.timestamp}, {$set: data.db}], undefined, globals.coll);
}

var insertPost = function(data, coll, path, update) {
	globals.path = path;
	globals.coll = coll;
	return writeFile(data).then(function(val) {
		if (!update) {
			return saveDatabase(val)
		} else {
			return updateDatabase(val)
		}
	}, crash)
}

var denodeify = function(fn, args, alt, th) {
	return new Promise(function(resolve, reject) {
		args[args.length] = (function(err, data) {
			if (err) {
				reject(err || "No Data")
			} else {
				resolve(alt ? alt(data) : data)
			}
		})
		try {
			fn.apply(th,args)
		} catch (e) {
			reject(e)
		}
	})
}

module.exports = function(db, path) {
	return (function(coll, path) {
		return function(data, update) {
			return insertPost(data, coll, path, update).catch(crash);
		}
	})(db.posts, path)
}

var crash = function(a) {
	console.error(a)
}

if (!module.parent) {
	prompt = require("prompt")
	prompt.start();
	prompt.colors = false
	var mongojs = require("mongojs")
	var db      = mongojs("mongodb://localhost/bydesign",["posts"])	
	fetchData().then(parseData, crash).then(getFile, crash).then(module.exports(db, __dirname+"/../client"), crash).then(function() {
		console.log("Finished")
		return Promise.resolve("done")
	}).catch(crash);
}

