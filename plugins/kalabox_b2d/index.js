'use strict';

/**
 * This contains some extra commands if you are using kalabox with
 * boot2docker ie on non-linux systems.
 */

var plugin = require('../../lib/plugin.js');
var deps = require('../../lib/deps.js');
var chalk = require('chalk');

var B2D_UP_ATTEMPTS = 3;
var B2D_DOWN_ATTEMPTS = 3;
var B2D_STATUS_ATTEMPTS = 3;
var B2D_IP_ATTEMPTS = 3;

module.exports = function(b2d, tasks) {

  // @todo: eventually these commands should only show up if you are on a
  // Boot2Docker machine ie Windows or Mac.

  // Start the kalabox VM and our core containers
  tasks.registerTask('up', function(done) {
    b2d.up(B2D_UP_ATTEMPTS, done);
  });

  // Stop the kalabox vm
  tasks.registerTask('down', function(done) {
    b2d.down(B2D_DOWN_ATTEMPTS, done);
  });

  // Get the UP address of the kalabox vm
  tasks.registerTask('ip', function(done) {
    b2d.ip(B2D_IP_ATTEMPTS, function(err, ip) {
      if (err) {
        throw err;
      } else {
        console.log(ip);
        done();
      }
    });
  });

  // Check status of kbox vm
  tasks.registerTask('status', function(done) {
    b2d.state(B2D_STATUS_ATTEMPTS, function(message) {
      console.log(message);
      done();
    });
  });

  // Events
  b2d.events.on('post-up', function() {
    console.log(chalk.green('Kalabox VM has been activated.'));
  });

  b2d.events.on('post-down', function() {
    console.log(chalk.red('Kalabox VM has been deactivated.'));
  });
};
