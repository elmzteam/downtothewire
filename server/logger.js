"use strict"

const colors = require("colors/safe")

function write(method, args, color) {
	const msg = []
	msg.push.apply(msg, args)
	// eslint-disable-next-line no-console
	console[method](colors[color](msg.join(" ")))
}

function log() {
	write("log", arguments, "white")
}

function info() {
	write("info", arguments, "blue")
}

function ok() {
	write("info", arguments, "green")
}

function warn() {
	write("warn", arguments, "yellow")
}

function error() {
	write("error", arguments, "red")
}

module.exports = {
	log: log,
	info: info,
	warn: warn,
	error: error,
	ok: ok
}
