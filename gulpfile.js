"use strict";

var SRC     = "client"
var BUILD   = "build"

var es2015       = require("babel-preset-es2015");
var gulp         = require("gulp")
var path         = require("path")
var sass         = require("gulp-sass")(require("sass"))
var autoprefixer = require("gulp-autoprefixer")
var babel        = require("gulp-babel")
var uglify       = require("gulp-uglify")
var image        = require("gulp-image")
// var $       = require("gulp-load-plugins")()

gulp.task("watch", function(){
	gulp.watch(path.join(SRC, "scss/**/*"), gulp.series("sass"))
	gulp.watch(path.join(SRC, "js/**/*"), gulp.series("js"))
	gulp.watch(path.join(SRC, "images/**/*"), gulp.series("images"))
})

gulp.task("sass", function() {
	return gulp.src(path.join(SRC, "scss/{style.scss,admin.scss,*.css}"))
		.pipe(sass({outputStyle: "compressed"}))
		.pipe(autoprefixer({
		browsers: ["last 2 versions", "> 1%"],
		cascade: false,
		remove: false
	}))
		.pipe(gulp.dest(path.join(BUILD, "css")))
})

gulp.task("js", function() {
	return gulp.src(path.join(SRC, "js/*.*"))
		.pipe(babel({ presets: [es2015] }))
		.pipe(uglify())
		.pipe(gulp.dest(path.join(BUILD, "js")))
})

gulp.task("images", function() {
	return gulp.src(path.join(SRC, "images/*.*"))
		.pipe(image())
		.pipe(gulp.dest(path.join(BUILD, "images")))
})

gulp.task("build", gulp.series("sass", "js", "images"))