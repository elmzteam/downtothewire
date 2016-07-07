module.exports = function(__dirname) {
	/**
	  * Imports and Initializations
	**/

	var path        = require("path");
	var config      = require("../config")

	var pm          = require("promised-mongo")
	var db          = pm("mongodb://localhost/bydesign", ["authors", "posts"])

	var handlebars  = require("handlebars")
	    handlebars  = require("./stachehelper")(handlebars, config.paths.client)

	var insert      = require("./insertPost")(db, config.paths.client)
	var Renderer    = require("./renderer")
	var api         = require("./api")(db)

	var express     = require("express")
	var app         = express()

	var cookie      = require("cookie-parser")
	var body        = require("body-parser")
	var session     = require("express-session")
	var MongoStore  = require("connect-mongo")(session)

	var Google      = require('passport-google-oauth').OAuth2Strategy
	var passport    = require("passport")

	var logger      = require("./logger")
	var morgan      = require("morgan")
	var utils       = require("./utils")

	var renderer = new Renderer(__dirname, db, handlebars);

	/**
	  * Middleware Initialization
	**/

	app.use(morgan("dev"))
	app.use(cookie())
	app.use(body.json())
	app.use(session({ secret: 'temporarysecret', store: new MongoStore({
		url: "mongodb://localhost/bydesign"
	}),
		resave: true,
		saveUninitialized: true,
	}))
	app.use(passport.initialize())
	app.use(passport.session())
	app.use(renderer.handle.bind(renderer))
	app.use(api)


	/**
	  * App routing
	**/

	app.use(express.static("build"))


	app.post("/visible", function(req, res) {
		if (req.user) {
			handleVisibility(req.body.state, req.body.page).
				then(function() {
					res.status(200)
					res.send({
						"state": req.body.state ? "visible" : "hidden",
						"visible": req.body.state
					})
					renderer.reload()
				}).
				catch(function(err) {
					res.status(500)
					res.send({
						"state": !req.body.state ? "visible" : "hidden",
						"visible": !req.body.state
					})
					logger.error(err)
				})
		} else {
			req.status(403)
			res.send("Please Log In first")
		}
	})

	app.post("/editor/", function(req, res) {
		if (req.user) {
			uploadPost(null, req.body, req.user.id)
				.then(function (id) {
					renderer.reload()
					res.send({msg: "Ok", id: id})
				})
				.catch(logger.error)
		} else {
			req.status(403)
			res.send("Please Log In first")
		}
	})

	app.post("/editor/:MOD", function(req, res) {
		if (req.user) {
			uploadPost(req.params.MOD, req.body, req.user.id)
				.then(renderer.reload.bind(renderer))
				.catch(logger.error)
			res.send({msg: "Ok"})
		} else {
			req.status(403)
			res.send("Please Log In first")
		}
	})

	/**
	  * Upload Handling
	**/

	var uploadPost = function(guid, body, author) {
		if (body.tags.length == 0 && body.title.match(/^\s*$/) && body.content.match(/^\s*$/) && modify) {
			return db.posts.remove({ guid });
		}

		if (!guid) {
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
							url: `posts/${id}`
						},
						slug: utils.slugify(body.title),
						content: body.content
					}));
		} else {
			return db.posts.update({ guid }, {
				$set: {
					title: {
						text: body.title
					},
					content: body.content,
					tags: body.tags
				}
			});
		}
	}

	var handleVisibility = function(visible, guid) {
		return db.posts.update({ guid }, { $set: { visible }});
	}

	/**
	  * MongoDB access functions
	**/

	var getAuthors = function(gid) {
		return db.authors.findOne({ gid });
	}

	/**
	  * Authentication using Passport OAuth
	**/

	passport.serializeUser(function(user, done) {
		db.authors.findOne({"id": user.id})
			.then((data) => {
				if (data !== undefined) {
					user._json.image.url = user._json.image.url.replace(/sz=50$/, "sz=576");
					return db.authors.update({"id": user.id}, user).then(() => done(undefined, JSON.stringify(user)));
				} else {
					return db.authors.insert(user, () => done(undefined, JSON.stringify(user)))
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
			function(accessToken, refreshToken, profile, done) {
				for (var i = 0; i < profile.emails.length; i++) {
					if (config.admins.indexOf(profile.emails[i].value) >= 0) {
						done(null, profile)
						return
					}
				}
				done("Non Admin")
			}
		))

		app.get('/google/login',
			passport.authenticate('google', { scope: 'https://www.googleapis.com/auth/userinfo.email' }))

		app.get(/^\/google\/auth/,
			passport.authenticate('google', { failureRedirect: '/google/login' }),
			function(req, res) {
				// Successful authentication, redirect home.
				res.redirect('/admin')
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
