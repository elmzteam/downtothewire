"use strict"

const colors = require("colors/safe")

const write = function(method, args, color) {
	const msg = []
	msg.push.apply(msg, args)
	// eslint-disable-next-line no-console
	console[method](colors[color](msg.join(" ")))
}

const log = function() {
	write("log", arguments, "white")
}

const info = function() {
	write("info", arguments, "blue")
}

const ok = function() {
	write("info", arguments, "green")
}

const warn = function() {
	write("warn", arguments, "yellow")
}

const error = function() {
	write("error", arguments, "red")
}

module.exports = {
	log: log,
	info: info,
	warn: warn,
	error: error,
	ok: ok
}
