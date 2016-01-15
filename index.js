var app		= require("./server/server")
var config	= require("./config")
var mkdirp	= require("mkdirp")

// Make sure the render directory exists
mkdirp(config.paths.render)

// Start the server
app(__dirname)