var gulp = require('gulp'),
    concat = require('gulp-concat');
    
gulp.task('build', function() {
  gulp.src('./src/**/*.js')
      .pipe(concat('html-mvc.js'))
      .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['build']);