'use strict';

/**
 * This exposes some commands if you need to turn the engine on.
 */

var chalk = require('chalk');

var PROVIDER_UP_ATTEMPTS = 3;
var PROVIDER_DOWN_ATTEMPTS = 3;
var PROVIDER_STATUS_ATTEMPTS = 3;
var PROVIDER_IP_ATTEMPTS = 3;

module.exports = function(engine, events, tasks) {

  if (engine.provider.hasTasks) {
    // Tasks
    // Start the kalabox engine
    tasks.registerTask('up', function(done) {
      engine.up(PROVIDER_UP_ATTEMPTS, done);
    });

    // Stop the kalabox engine
    tasks.registerTask('down', function(done) {
      engine.down(PROVIDER_DOWN_ATTEMPTS, done);
    });

    // Events
    events.on('post-up', function(done) {
      console.log(chalk.green('Kalabox engine has been activated.'));
      done();
    });

    events.on('post-down', function(done) {
      console.log(chalk.red('Kalabox engine has been deactivated.'));
      done();
    });
  }

};
