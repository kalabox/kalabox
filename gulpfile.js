var gulp = require('gulp');
var AppManager = require('./appmanager.js');
var am = new AppManager('./myd8site');

// Creates app containers
gulp.task('init', ['pull-images'], function() {
  am.init();
});

gulp.task('start', function() {
  am.start();
});

gulp.task('stop', function() {
  am.stop();
});

gulp.task('restart', function() {
  am.restart();
});

gulp.task('kill', function() {
  am.kill();
});

gulp.task('remove', function() {
  am.remove();
});

gulp.task('pull-images', function() {
  return am.pullImages();
});