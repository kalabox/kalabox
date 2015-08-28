'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  kbox.whenAppRegistered(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'start'];
      task.description = 'Start an installed kbox application.';
      task.func = function(done) {
        kbox.app.start(app, done);
      };
    });
  });

};
