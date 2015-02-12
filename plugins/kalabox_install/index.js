'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var unix = require('./installer.js');
var windows = require('./installer-win.js');

module.exports = function(tasks) {
  // @todo: infinite timeout?
  // Installs the dependencies for kalabox to run
  tasks.registerTask('provision', function(done) {
    if (process.platform === 'win32') {
      windows.run(done);
    }
    else {
      unix.run(done);
    }
  });

};
