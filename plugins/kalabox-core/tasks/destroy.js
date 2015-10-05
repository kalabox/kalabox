'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  kbox.whenAppRegistered(function(app) {

    kbox.tasks.add(function(task) {
      task.path = [app.name, 'destroy'];
      task.category = 'appAction';
      task.description = 'Completely destroys and removes an app.';
      task.func = function(done) {

        kbox.app.destroy(app, done);

      };
    });

  });

};
