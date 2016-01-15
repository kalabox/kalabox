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

    // If on posix pass in a password options
    if (process.platform !== 'win32') {
      task.options.push({
        name: 'password',
        kind: 'string',
        description: 'Sudo password for admin commands.'
      });
    }

    task.func = function() {
      var password = this.options.password;
      return installer.run({nonInteractive: true, password: password});
    };
  });

};
