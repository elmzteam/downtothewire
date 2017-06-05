const mongo   = require("promised-mongo")
const db      = mongo("mongodb://localhost/bydesign", ["authors", "posts", "metadata", "categories"])
const console = require("beautiful-log")
const config  = require("../config")
const utils   = require("./utils")

let isLessThan = utils.isLessThan

/* 
 * upgradeToOne: Version 1 adds categories to the database
 *     It defaults to setting all current articles to
 *     "Technology" or whichever label is first in the
 *     config file
 */
let upgradeToOne = (version) => {
	console.warn(`Upgrading database from version ${version} to 1`)
	let promises = []

	// Add in a categories table with each of the config's
	// categories in it
	for (let category of config.categories) {
		promises.push(db.categories.insert({
			category: category.name,
			shortname: category.shortname,
		}))
	}

	// Update all the posts with the default category
	// Then return the current version number
	return db.posts.find({})
	  .then((posts) => {
		let promises = []

		for (let post of posts) {
			post.category = config.categories[0].name
			promises.push(db.posts.save(post))
		}

		return Promise.all(promises)
	}).then(Promise.all(promises))
	  .then(() => 1)
}

/*
 * saveVersion: Saves the current version to the metadata
 *     collection of the database
 */
let saveVersion = (version) => {
	return db.metadata.update({version: {$exists: true}}, {version: version}, {upsert: true})
}

/*
 * upgradeDatabase: Get's the current database version
 *      and then checks to see which updates need to be
 *      applied, and applies them sequentially.
 *      Returns a promise for when it's finished.
 */
function upgradeDatabase() {
	return db.metadata.find({version: {$exists: true}}, {version: true, _id: false})
	  .then(databaseVersion => {
		console.log(databaseVersion)
		if (databaseVersion === [] || !databaseVersion) {
			return 0
		}
		return databaseVersion
	}).then(isLessThan(1, upgradeToOne))
	  .then(saveVersion) 
}

module.exports = upgradeDatabase
