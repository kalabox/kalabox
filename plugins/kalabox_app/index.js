'use strict';

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var rimraf = require('rimraf');
var plugin = require('../../lib/plugin.js');

module.exports = function(manager, app, docker, tasks, appConfig) {

  tasks.registerTask([app.name, 'config'], function(done) {
    console.log(JSON.stringify(appConfig, null, '\t'));
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

  app.on('post-init', function() {
    var a = _.cloneDeep(app);
    delete a.components;
    fs.writeFileSync(path.resolve(app.dataPath, 'app.json'), JSON.stringify(a));
  });

  app.on('post-remove', function() {
    rimraf(app.dataPath, function(err) {
      if (err) {
        throw err;
      }
    });
  });

};
