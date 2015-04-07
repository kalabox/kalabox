'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  kbox.whenApp(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'restart'];
      task.description = 'Stop and then start a running kbox application.';
      task.func = function(done) {
        kbox.app.restart(app, done);
      };
    });
  });

};
