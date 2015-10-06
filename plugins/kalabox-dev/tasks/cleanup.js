'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  kbox.tasks.add(function(task) {
    task.path = ['cleanup'];
    task.category = 'dev';
    task.description = 'CLEANUP TEST';
    task.func = function(done) {
      return kbox.app.cleanup(done);
    };
  });

};
