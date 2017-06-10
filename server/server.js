/* eslint global-require: off */
module.exports = function(__dirname) {
	/**
	 * Imports and Initializations
	 **/

	// const crypto      = require("crypto")
	const path        = require("path")
	const config      = require("../config")
	const utils       = require("./utils")

	const pm          = require("promised-mongo")
	const db          = pm("mongodb://localhost/bydesign", ["authors", "posts"])

	let handlebars    = require("handlebars")
	handlebars        = require("./stachehelper")(handlebars, config.paths.client)

	// const insert      = require("./insertPost")(db, config.paths.client)
	const Renderer    = require("./renderer")
	const api         = require("./api")(db)

	const express     = require("express")
	const app         = express()

	const cookie      = require("cookie-parser")
	const body        = require("body-parser")
	const multer      = require("multer")
	/** Won't work on windows probably **/
	const upload      = multer({ dest: "/tmp/" })
	const session     = require("express-session")
	const MongoStore  = require("connect-mongo")(session)

	const Google      = require("passport-google-oauth").OAuth2Strategy
	const passport    = require("passport")

	const logger      = require("./logger")
	const morgan      = require("morgan")
	const fs          = utils.fs

	const secret      = process.env.PASSPORT_SECRET ? process.env.PASSPORT_SECRET : "testsecret"

	const renderer    = new Renderer(__dirname, db, handlebars)

	/**
	 * Middleware Initialization
	 **/

	app.use(morgan("dev"))
	app.use(cookie())
	app.use(body.json())
	app.use(session({
		secret: secret, store: new MongoStore({ url: "mongodb://localhost/bydesign" }),
		resave: true,
		saveUninitialized: true
	}))
	app.use(passport.initialize())
	app.use(passport.session())
	app.use(renderer.handle.bind(renderer))
	app.use(api)

	/**
	 * Annotations
	 **/

	const requireAdmin = (fn) => (req, res) => {
		if (req.user) {
			return fn(req, res)
		} else {
			req.status(403)
			res.send("Please Log In first")
		}
	}

	const handleVisibility = function(visible, guid) {
		return db.posts.update({ guid }, { $set: { visible } })
	}

	/**
	 * Upload Handling
	 **/

	const uploadPost = (guid, body, author) => {
		if (body.tags.length === 0 && body.title.match(/^\s*$/) && body.content.match(/^\s*$/) && guid) {
			return db.posts.remove({ guid })
		}

		if (guid) {
			return db.posts.update({ guid }, {
				$set: {
					"title.text": body.title,
					"content": body.content,
					"tags": body.tags
				}
			})
		} else {
			return utils.generateId(db.posts)
				.then((id) =>
					db.posts.insert({
						tags: body.tags,
						visible: body.visible === true,
						author: author,
						timestamp: Date.now(),
						guid: id,
						title: {
							text: body.title,
							url: `/posts/${id}`
						},
						slug: utils.slugify(body.title),
						content: body.content
					})
						.then(() => id)
				)
		}
	}

	/**
	 * App routing
	 **/

	app.use(express.static("build"))
	app.use("/upload", express.static(config.paths.upload))

	app.post("/visible", requireAdmin((req, res) => {
		handleVisibility(req.body.state, req.body.page).then(() => {
			res.status(200)
			res.send({
				"state": req.body.state ? "visible" : "hidden",
				"visible": req.body.state
			})
			renderer.reload()
		}).catch(function(err) {
			res.status(500)
			res.send({
				"state": req.body.state ? "hidden" : "visible",
				"visible": !req.body.state
			})
			logger.error(err)
		})
	}))

	app.post("/static/", upload.single("file"), requireAdmin((req, res) => {
		const hash = req.file.filename.slice(0, 8)
		let sluggedFile = req.file.originalname
			.split(".")
			.map((e) => utils.slugify(e))
			.join(".")
		// No directory traversals in my house
		sluggedFile = sluggedFile.replace(/\.(\.)+/g, "")
		const prefixName = `${hash}-${sluggedFile}`
		fs.rename(req.file.path, path.join(__dirname, config.paths.upload, prefixName))
			.then(() => res.send({
				path: path.join("/upload/", prefixName),
				file: prefixName,
				shortFile: sluggedFile
			})).catch((e) => {
				logger.error(e)
				res.status(500).send({ error: "Could not upload file" })
			})
	}))

	app.delete("/static/:FILE", requireAdmin(function(req, res) {
		const filePath = path.join(__dirname, config.paths.upload, req.params.FILE)
		fs.stat(filePath).then((stat) => {
			if (stat && stat.isFile()) {
				//All Good!

			} else {
				throw new Error("File Not Found")
			}
		}).then(fs.unlink(filePath)).then(() => res.send({ success: true })).catch((e) => {
			logger.error(e)
			res.status(503).send({ error: "Resource unavailable", success: false })
		})
	}))

	app.post("/editor/", requireAdmin((req, res) => uploadPost(null, req.body, req.user.id)
		.then(function(id) {
			renderer.reload()
			res.send({ msg: "Ok", id: id })
		})
		.catch(logger.error)
	))

	app.post("/editor/:MOD", requireAdmin((req, res) => {
		uploadPost(req.params.MOD, req.body, req.user.id)
			.then(renderer.reload.bind(renderer))
			.catch(logger.error)
		res.send({ msg: "Ok" })
	}))

	/**
	 * MongoDB access functions
	 **/

	// const getAuthors = function(gid) {
	// 	return db.authors.findOne({ gid })
	// }

	/**
	 * Authentication using Passport OAuth
	 **/

	passport.serializeUser(function(user, done) {
		db.authors.findOne({ "id": user.id })
			.then((data) => {
				if (data !== undefined && data !== null) {
					user._json.image.url = user._json.image.url.replace(/sz=50$/, "sz=576")
					return db.authors.update({ "id": user.id }, user).then(() => done(undefined, JSON.stringify(user)))
				} else {
					return db.authors.insert(user).then(() => done(undefined, JSON.stringify(user)))
				}
			})
			.catch((err) => done(err, JSON.stringify(user)))
	})

	passport.deserializeUser(function(user, done) {
		done(null, JSON.parse(user))
	})

	if (process.env.AUTH_SECRET) {
		passport.use(new Google({
			clientID: "477715393921-ft3c5717cv685qomofqhksgtg2sk6ciu.apps.googleusercontent.com",
			clientSecret: process.env.AUTH_SECRET,
			callbackURL: process.env.REMOTE ? "http://dttw.tech/google/auth" : "http://127.0.0.1:3000/google/auth"
		},
			(accessToken, refreshToken, profile, done) => {
				for (let i = 0; i < profile.emails.length; i++) {
					if (config.admins.indexOf(profile.emails[i].value) >= 0) {
						done(null, profile)
						return
					}
				}
				done("Non Admin")
			}
		))

		app.get("/google/login",
			passport.authenticate("google", { scope: "https://www.googleapis.com/auth/userinfo.email" }))

		app.get(/^\/google\/auth/,
			passport.authenticate("google", { failureRedirect: "/google/login" }),
			function(req, res) {
				// Successful authentication, redirect home.
				res.redirect("/admin")
			})
	} else {
		logger.warn("Missing authentication variable. Authentication will be unavailable.")
	}

	// Default Case: 404
	app.use(renderer.fourohfour.bind(renderer))

	/**
	 * API Access
	 **/


	/**
	 * Start Server
	 **/

	app.listen(3000)

	return app
}
