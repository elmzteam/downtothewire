const app		= require("./server/server")
const config	= require("./config")
const mkdirp	= require("mkdirp")

// Make sure the render directory exists
mkdirp(config.paths.render)
mkdirp(config.paths.upload)

// Start the server
app(__dirname)
