'use strict';

var rmdir = require('rimraf');

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var events = kbox.core.events;

  kbox.whenApp(function(app) {

    kbox.tasks.add(function(task) {
      task.path = [app.name, 'uninstall'];
      task.description = 'Uninstall an installed kbox application';
      task.func = function(done) {
        kbox.app.uninstall(app, done);
      };
    });

    events.on('post-uninstall', function(app, done) {
      console.log('Removing the codez.');
      rmdir(app.config.codeRoot, function(err) {
        if (err) {
          done(err);
        }
        else {
          done();
        }
      });
    });

  });

};
