var express  = require("express")
var app      = express()

var cookie   = require("cookie-parser")
var body     = require("body-parser")
var session  = require("express-session")

var Google   = require('passport-google-oauth').OAuth2Strategy
var passport = require("passport")

app.use(cookie());
app.use(body.json());
app.use(session({ secret: 'temporarysecret', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

app.get("/", function (req, res) {
	console.log(req.user)
	res.send("Hello World")
})
 
passport.serializeUser(function(user, done) {
	done(null, JSON.stringify(user))
});

passport.deserializeUser(function(user, done) {
	done(null, JSON.parse(user))
});

passport.use(new Google({
		clientID: "477715393921-ft3c5717cv685qomofqhksgtg2sk6ciu.apps.googleusercontent.com",
		clientSecret: "xAx3xD2o9OTa_R-es7r_fzAa",
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

app.listen(3000);
