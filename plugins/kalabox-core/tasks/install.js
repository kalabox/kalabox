'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  kbox.whenApp(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'install'];
      task.description = 'Install a kbox application.';
      task.func = function(done) {
        kbox.app.install(app, done);
      };
    });
  });

};
