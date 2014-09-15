/**
 * gulp list
 * gulp init --app myd8site
 * gulp start --app myd8site
 * gulp stop --app myd8site
 * gulp restart --app myd8site
 * gulp kill --app myd8site
 * gulp remove --app myd8site
 * gulp pull --app myd8site
 * gulp build --app myd8site
 */
var _ = require('lodash');
var gulp = require('gulp');
var gutil = require('gulp-util');
var fs = require('fs');
var path = require('path');
var am = require('./lib/appmanager.js');

var appname = gutil.env.app ? gutil.env.app : null;
console.log(appname);

if (appname) {
  try {
    var app = new am.App(appname);
  }
  catch (err) {
    throw err;
  }
}

gulp.task('list', function() {
  var apps = am.getApps();
  var i = 1;
  gutil.log(' ');
  gutil.log('Kalabox Apps:');
  for (var x in apps) {
    gutil.log('  ', i + ')', apps[x].config.name, "\t", apps[x].url);
    i++;
  }
  gutil.log(' ');
});

// Creates app containers
gulp.task('init', function() {
  return app.init();
});

gulp.task('start', function() {
  gutil.log('Starting', appname);
  app.start();
});

gulp.task('stop', function() {
  gutil.log('Stopping', appname);
  app.stop();
});

gulp.task('restart', function() {
  gutil.log('Restarting', appname);
  app.restart();
});

gulp.task('kill', function() {
  gutil.log('Killing', appname);
  app.kill();
});

gulp.task('remove', function() {
  gutil.log('Removing', appname);
  app.remove();
});

gulp.task('pull', function() {
  gutil.log('Pulling images for', appname);
  return app.pull();
});

gulp.task('build', function(done) {
  gutil.log('Building images for', appname);
  return app.build(done);
});