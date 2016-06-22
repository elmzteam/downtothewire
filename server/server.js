module.exports = function(__dirname) {
	/**
	  * Imports and Initializations 
	**/
	
	var path        = require("path");
	var config      = require("../config")
	
	var mongojs     = require("mongojs")
	var db          = mongojs("mongodb://localhost/bydesign",["authors", "posts"])

	var handlebars  = require("handlebars")
	    handlebars  = require("./stachehelper")(handlebars, db, config.paths.client)
		
	var insert      = require("./insertPost")(db, config.paths.client)
	var renderer    = require("./renderer")(__dirname, handlebars, db)
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

	/**
	  * Middleware Initialization
	**/

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
	app.use(morgan("dev"))
	app.use(renderer.handle)
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
			uploadPost(null, req.body, req.user.id).
				then(function (id) {
					renderer.reload()
					res.send({msg: "Ok", id: id})
				}).
				catch(logger.error)
		} else {
			req.status(403)
			res.send("Please Log In first")
		}
	})

	app.post("/editor/:MOD", function(req, res) {
		if (req.user) {
			uploadPost(req.params.MOD, req.body, req.user.id).
				then(renderer.reload).
				catch(logger.error)
			res.send({msg: "Ok"})
		} else {
			req.status(403)
			res.send("Please Log In first")
		}
	})
	
	/**
	  * Upload Handling
	**/

	var uploadPost = function(modify, body, author) {
		var time = modify ? parseInt(modify) : Date.now()
		data = {
			db: {	
				title: {
					text: body.title,
					url: "/posts/"+time
				},
				timestamp: time,
				tags: body.tags,
				visible: body.visible || false
			},
			content: {
				value: body.content
			}
		}
		if (!modify) data.db.author = author
		return insert(data, modify ? true : false).then(function() {
			return time
		})
	}

	var handleVisibility = function(visible, page) {
		return new Promise(function(resolve, reject) {
			var id = parseInt(page)
			if (isNaN(id)) {
				reject("Bad Id")
				return
			}
			db.posts.update({timestamp: id}, {$set:{visible: visible}}, function(err, doc) {
				if (err) {
					reject(err || "Bad Id")
					return
				}
				resolve("A OK")
			})
		})
	}

	/**
	  * MongoDB access functions
	**/
	
	var getAuthors = function(id) {
		return new Promise(function(resolve, reject) { 
			db.authors.findOne({"gid": id}, function(err, val) {
				if (err || !val) {
					reject(err || "Nonexistent author")
					return
				}
				resolve(val)
			})
		})
	}

	/**
	  * Authentication using Passport OAuth
	**/
	 
	passport.serializeUser(function(user, done) {
		db.authors.find({"id": user.id}, function(err, data) {
			if (!err && data.length > 0) {
				user._json.image.url = user._json.image.url.replace(/sz=50$/, "sz=576")
				db.authors.update({"id": user.id}, user, function(err) {
					done(err, JSON.stringify(user))
				})
			} else {
				db.authors.insert(user, function(err) {
					done(err, JSON.stringify(user))	
				})
			}
		})
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

		app.get('/google/auth',
			passport.authenticate('google', { failureRedirect: '/google/login' }),
			function(req, res) {
				// Successful authentication, redirect home.
				res.redirect('/admin')
			})
	} else {
		logger.warn("Missing authentication variable. Authentication will be unavailable.")
	}
	
	// Default Case: 404
	app.use(renderer.fourohfour)

	/**
	  * API Access
	**/

	

	/**
	  * Start Server
	**/

	app.listen(3000)

	return app
}
