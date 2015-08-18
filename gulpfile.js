var gulp = require('gulp'),
    concat = require('gulp-concat'),
    wrap = require('gulp-wrap');
    
gulp.task('build', function() {
  var sources = [
    './src/html-mvc.js',
    './src/bind-view.js',
    './src/parse-multipart-message.js',
    './src/serialize-form.js',
    './src/extend-nodes.js',
    './src/extend-browser-behaviors.js',
    './src/initialize.js'
  ];

  gulp.src(sources)
      .pipe(concat('html-mvc.js'))
      .pipe(wrap('\'use strict\';\r\n<%= contents %>'))
      .pipe(gulp.dest('./build'))  // For closure-less testing
      .pipe(wrap('(function(window, document, history){<%= contents %>})(window, document, history);'))
      .pipe(gulp.dest('./dist'));  // For production use
});

gulp.task('default', ['build']);