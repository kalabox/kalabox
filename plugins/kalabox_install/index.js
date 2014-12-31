'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var installer = require('./installer.js');

module.exports = function(tasks) {
  // @todo: infinite timeout?
  // Installs the dependencies for kalabox to run
  tasks.registerTask('install', function(done) {
    installer.run(done);
  });

};
