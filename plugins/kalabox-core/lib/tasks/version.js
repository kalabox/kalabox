'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  // Prints out the kbox version.
  kbox.tasks.add(function(task) {
    task.path = ['version'];
    task.description = 'Display the kbox version.';
    task.func = function() {
      console.log(kbox.core.config.getGlobalConfig().version);
    };
  });

};
