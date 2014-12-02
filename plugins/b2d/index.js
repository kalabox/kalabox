'use strict';

var plugin = require('../../lib/plugin.js');

var B2D_UP_TIMEOUT = 120 * 1000;
var B2D_DOWN_TIMEOUT = 60 * 1000;
var TASK_PREFIX = 'b2d';

module.exports = function(b2d, manager) {

  manager.registerTask(TASK_PREFIX + '.up', B2D_UP_TIMEOUT, function(done) {
    b2d.up(done);
  });

  manager.registerTask(TASK_PREFIX + '.down', B2D_DOWN_TIMEOUT, function(done) {
    b2d.down(done);
  });

  manager.registerTask(TASK_PREFIX + '.status', function(done) {
    b2d.status(function(status) {
      console.log(status);
      done();
    });
  });

  manager.registerTask(TASK_PREFIX + '.ip', function(done) {
    b2d.ip(function(err, ip) {
      if (err) {
        throw err;
      } else {
        console.log(ip);
        done();
      }
    });
  });

};
