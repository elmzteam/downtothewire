module.exports = function(__dirname, settings) {
	/**
	  * Constants and other globals
	**/

	var path = __dirname+"/client/"

	/**
	  * Imports and Initializations 
	**/
	
	var mongojs    = require("mongojs")
	var db         = mongojs("mongodb://localhost/bydesign",["authors", "posts"])

	var handlebars = require("handlebars")
	    handlebars = require("./stachehelper")(handlebars, db, path)
	var insert     = require("./insertPost")(db, path)
	var renderer   = require("./renderer")(__dirname, handlebars)

	var express    = require("express")
	var app        = express()

	var cookie     = require("cookie-parser")
	var body       = require("body-parser")
	var session    = require("express-session")
	var MongoStore = require("connect-mongo")(session)

	var Google     = require('passport-google-oauth').OAuth2Strategy
	var passport   = require("passport")
	
	var logger     = require("./logger")
	var morgan     = require("morgan")


	/**
	  * Middleware Initialization
	**/

	app.use(cookie());
	app.use(body.json());
	app.use(session({ secret: 'temporarysecret', store: new MongoStore({
		url: "mongodb://localhost/bydesign"		
	}),
		resave: true,
		saveUninitialized: true,
	}));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(morgan("dev"))
	app.use(renderer.handle)

	/**
	  * App routing
	**/

	app.get("/css/:FILE", function (req, res) {
		res.sendFile(req.params.FILE, {root: path+"build/css"})
	})

	app.get("/scripts/:FILE", function (req, res) {
		res.sendFile(req.params.FILE, {root: path+"scripts"})
	})

	app.get("/images/:FILE", function (req, res) {
		res.sendFile(req.params.FILE, {root: path+"images"})
	})

	app.post("/editor/", function(req, res) {
		uploadPost(null, req.body, req.user.id);
		renderer.reload()
		res.send("Ok")
	})

	app.post("/editor/:MOD", function(req, res) {
		uploadPost(req.params.MOD, req.body, req.user.id);
		renderer.reload()
		res.send("Ok")
	})
	
	/**
	  * Upload Handling
	**/

	var uploadPost = function(modify, body, author) {
		data = {
			db: {	
				title: {
					text: body.title,
				},
				timestamp: modify ? modify : Date.now(),
				tags: body.tags,
				author: author
			},
			content: {
				value: body.content
			}
		}
		insert(data, modify ? true : false)
	}
	/**
	  * MongoDB access functions
	**/
	
	var getAuthors = function(id) {
		return new Promise(function(resolve, reject) { 
			db.authors.findOne({"gid": id}, function(err, val) {
				if (err || !val) {
					reject(err || "Nonexistent author")
					return;
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
			console.log(arguments)
			if (!err && data.length > 0) {
				db.authors.update({"id": user.id}, user, function(err) {
					done(err, JSON.stringify(user));
				})
			} else {
				db.authors.insert(user, function(err) {
					done(err, JSON.stringify(user));	
				});
			}
		})
	})

	passport.deserializeUser(function(user, done) {
		done(null, JSON.parse(user))
	});

	if (process.env.AUTH_SECRET) {
		passport.use(new Google({
				clientID: "477715393921-ft3c5717cv685qomofqhksgtg2sk6ciu.apps.googleusercontent.com",
				clientSecret: process.env.AUTH_SECRET,
				callbackURL: "http://jsby.design/google/auth"
			},
			function(accessToken, refreshToken, profile, done) {
				for (var i = 0; i < profile.emails.length; i++) {
					if (settings.admins.indexOf(profile.emails[i].value) >= 0) {
						done(null, profile)
						return;
					}
				}
				done("Non Admin")
			}
		));

		app.get('/google/login',
			passport.authenticate('google', { scope: 'https://www.googleapis.com/auth/userinfo.email' }));

		app.get('/google/auth',
			passport.authenticate('google', { failureRedirect: '/google/login' }),
			function(req, res) {
				// Successful authentication, redirect home.
				res.redirect('/')
			});
	} else {
		logger.warn("Missing authentication variable. Authentication will be unavailable.")
	}
	/**
	  * Start Server
	**/

	app.listen(3000);

	return app;
}
