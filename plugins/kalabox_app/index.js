'use strict';

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var rimraf = require('rimraf');
var plugin = require('../../lib/plugin.js');

module.exports = function() {
  plugin.init(function(manager, app, docker) {

    manager.registerTask('init', function(done) {
      manager.init(app, done);
    });

    manager.registerTask('start', function(done) {
      manager.start(app, done);
    });

    manager.registerTask('stop', function(done) {
      manager.stop(app, done);
    });

    manager.registerTask('restart', function(done) {
      manager.stop(app, function(err) {
        if (err) {
          done(err);
        } else {
          manager.start(app, done);
        }
      });
    });

    manager.registerTask('kill', function(done) {
      manager.kill(app, done);
    });

    manager.registerTask('remove', function(done) {
      manager.remove(app, done);
    });

    manager.registerTask('pull', function(done) {
      manager.pull(app, done);
    });

    manager.registerTask('build', function(done) {
      manager.build(app, done);
    });

    app.on('post-init', function() {
      var a = _.cloneDeep(app);
      delete a.components;
      fs.writeFileSync(path.resolve(app.dataPath, 'app.json'), JSON.stringify(a));
    });

  });
};
