"use strict";

var gulp = require("gulp");
var $ = require("gulp-load-plugins")();

gulp.task("watch", function(){
	gulp.watch("client/scss/**/*.scss", ["sass"]);
});

gulp.task("build", ["sass"]);

gulp.task("sass", function() {
	return gulp.src("client/scss/{style.scss,admin.scss}")
		.pipe($.sass({outputStyle: "compressed"}))
		.pipe($.autoprefixer({
			browsers: ["last 2 versions", "> 1%"],
			cascade: false,
			remove: false
		}))
		.pipe(gulp.dest("client/build/css"));
});