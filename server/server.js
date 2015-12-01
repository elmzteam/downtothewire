module.exports = function(__dirname) {
	/**
	  * Imports and Initializations 
	**/

	var renderer   = require("./renderer")
	var handlebars = require("handlebars")

	var express    = require("express")
	var app        = express()

	var cookie     = require("cookie-parser")
	var body       = require("body-parser")
	var session    = require("express-session")

	var Google     = require('passport-google-oauth').OAuth2Strategy
	var passport   = require("passport")

	/**
	  * Middleware Initialization
	**/

	app.use(cookie());
	app.use(body.json());
	app.use(session({ secret: 'temporarysecret', resave: true, saveUninitialized: true }));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(renderer(__dirname, handlebars))

	/**
	  * Constants and other globals
	**/

	var path = __dirname+"/client/tmp/"

	/**
	  * App routing
	**/

	app.get("/", function (req, res) {
		res.sendFile("index.html", {root: path+"hbs"})
	})

	app.get("/css/:FILE", function (req, res) {
		res.sendFile(req.params.FILE, {root: path+"css"})
	})

	app.get("/scripts/:FILE", function (req, res) {
		res.sendFile(req.params.FILE, {root: path+"scripts"})
	})

	/**
	  * Authentication using Passport OAuth
	**/
	 
	passport.serializeUser(function(user, done) {
		done(null, JSON.stringify(user))
	});

	passport.deserializeUser(function(user, done) {
		done(null, JSON.parse(user))
	});

	if (process.env.AUTH_SECRET) {
		passport.use(new Google({
				clientID: "477715393921-ft3c5717cv685qomofqhksgtg2sk6ciu.apps.googleusercontent.com",
				clientSecret: process.env.AUTH_SECRET,
				callbackURL: "http://127.0.0.1:3000/google/auth"
			},
			function(accessToken, refreshToken, profile, done) {
				done(null, profile.id)
				return
				User.findOrCreate({ googleId: profile.id }, function (err, user) {
					return done(err, user)
				});
			}
		));

		app.get('/google/login',
			passport.authenticate('google', { scope: 'https://www.googleapis.com/auth/plus.login' }));

		app.get('/google/auth',
			passport.authenticate('google', { failureRedirect: '/google/login' }),
			function(req, res) {
				// Successful authentication, redirect home.
				res.redirect('/')
			});
	} else {
		console.log("ERROR: Missing authentication variable. Authentication will be unavailable")
	}
	/**
	  * Start Server
	**/

	app.listen(3000);

	return app;
}
