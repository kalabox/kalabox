'use strict';

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var async = require('async');
var rimraf = require('rimraf');

module.exports = function(manager, app, docker, tasks, appConfig, argv) {

  tasks.registerTask([app.name, 'config'], function(done) {
    var query = argv._[0];
    var target = appConfig;
    if (query !== undefined) {
      target = target[query];
    }
    console.log(JSON.stringify(target, null, '\t'));
    done();
  });

  tasks.registerTask([app.name, 'init'], function(done) {
    manager.init(app, done);
  });

  tasks.registerTask([app.name, 'start'], function(done) {
    manager.start(app, done);
  });

  tasks.registerTask([app.name, 'stop'], function(done) {
    manager.stop(app, done);
  });

  tasks.registerTask([app.name, 'restart'], function(done) {
    manager.stop(app, function(err) {
      if (err) {
        done(err);
      } else {
        manager.start(app, done);
      }
    });
  });

  tasks.registerTask([app.name, 'kill'], function(done) {
    manager.kill(app, done);
  });

  tasks.registerTask([app.name, 'remove'], function(done) {
    manager.remove(app, done);
  });

  tasks.registerTask([app.name, 'pull'], function(done) {
    manager.pull(app, done);
  });

  tasks.registerTask([app.name, 'build'], function(done) {
    manager.build(app, done);
  });

};
