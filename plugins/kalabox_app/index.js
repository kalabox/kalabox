'use strict';

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var rimraf = require('rimraf');
var plugin = require('../../lib/plugin.js');

module.exports = function() {
  plugin.init(function(manager, app) {

    manager.registerTask('info', function() {
      console.log('app: ' + app.name);
    });

    manager.registerTask('purge', function() {
      rimraf.sync(app.dataPath);
    });

    manager.registerTask('init', function() {
      manager.init(app);
    });

    manager.registerTask('start', function() {
      manager.start(app);
    });

    manager.registerTask('stop', function() {
      manager.stop(app);
    });

    manager.registerTask('restart', function() {
      manager.restart(app);
    });

    manager.registerTask('kill', function() {
      manager.kill(app);
    });

    manager.registerTask('remove', function() {
      manager.remove(app);
    });

    manager.registerTask('pull', function() {
      manager.pull(app);
    });

    manager.registerTask('build', function() {
      manager.build(app);
    });

    app.on('post-init', function() {
      var a = _.cloneDeep(app);
      delete a.components;
      fs.writeFileSync(path.resolve(app.dataPath, 'app.json'), JSON.stringify(a));
    });

  });

};
