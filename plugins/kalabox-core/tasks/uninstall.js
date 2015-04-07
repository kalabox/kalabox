'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  kbox.whenApp(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'uninstall'];
      task.description = 'Uninstall an installed kbox application';
      task.func = function(done) {
        kbox.app.uninstall(app, done);
      };
    });
  });

};
