var gulp = require("gulp");
var sass = require("gulp-sass");
var merge = require('merge-stream');
var autoprefix = require("gulp-autoprefixer")

gulp.task("watch", function(){
	gulp.watch("client/scss/**/*.scss", ["sass"]);
});

gulp.task("build", ["sass"]);

gulp.task("sass", function(){
	var style = gulp.src("client/scss/style.scss")
		.pipe(sass({outputStyle: "compressed"}))
		.pipe(autoprefix({
		browsers: ["last 2 versions", "> 1%"],
		cascade: false,
		remove: false
	}))
		.pipe(gulp.dest("client/build/css"));
	
	var editor = gulp.src("client/scss/editor.scss")
		.pipe(sass({outputStyle: "compressed"}))
		.pipe(autoprefix({
		browsers: ["last 2 versions", "> 1%"],
		cascade: false,
		remove: false
	}))
		.pipe(gulp.dest("client/build/css"));
	
	return merge(style, editor);
});