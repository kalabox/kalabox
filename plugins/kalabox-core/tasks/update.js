'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  // Grab our installer
  var installer = kbox.install;

  kbox.tasks.add(function(task) {
    task.path = ['update'];
    task.description = 'Run this after you update your Kalabox code.';
    task.func = function(done) {
      return installer.run({nonInteractive: true});
    };
  });

};
