'use strict';

var _ = require('lodash');
var chalk = require('chalk');
var plugin = require('../../lib/plugin.js');
var deps = require('../../lib/deps.js');
var installer = require('../../lib/install.js');


var B2D_UP_ATTEMPTS = 3;
var B2D_DOWN_ATTEMPTS = 3;
var B2D_STATUS_ATTEMPTS = 3;
var B2D_IP_ATTEMPTS = 3;

module.exports = function(argv, b2d, globalConfig, manager, plugin, tasks) {

  // Tasks
  // @todo: infinite timeout?
  tasks.registerTask('install', function(done) {
    installer.run(done);
  });

  // Start the kalabox VM and our core containers
  tasks.registerTask('up', function(done) {
    b2d.up(b2d, B2D_UP_ATTEMPTS, done);
  });
  tasks.registerTask('down', function(done) {
    b2d.down(b2d, B2D_DOWN_ATTEMPTS, done);
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

  // Check status of kbox
  tasks.registerTask('status', function(done) {
    b2d.state(B2D_STATUS_ATTEMPTS, function(message) {
      console.log(message);
      done();
    });
  });

  tasks.registerTask('config', function(done) {
    console.log(JSON.stringify(globalConfig, null, '\t'));
    done();
  });

  tasks.registerTask('list', function(done) {
    var i = 1;
    manager.getApps(function(apps) {
      _(apps).each(function(a) {
        var status = '';
        if (a.status === 'enabled') {
          status = 'Enabled';
          console.log(chalk.green(' ' + i + '. ' + a.config.title + ' (' + a.name + ')\t\t', a.url + '\t\t', status));
        }
        else if (a.status === 'disabled') {
          status = 'Disabled';
          console.log(chalk.magenta(' ' + i + '. ' + a.config.title + ' (' + a.name + ')\t\t', a.url + '\t\t', status));
        }
        else {
          status = 'Uninstalled';
          console.log(chalk.red(' ' + i + '. ' + a.config.title + ' (' + a.name + ')\t\t', a.url + '\t\t', status));
        }
        i++;
      });
      console.log('');
    });
    console.log('');
    done();
  });

  tasks.registerTask('pc', function(done) {
    var onRemove = function(data) {
      // container was removed
    };
    var onDone = function() {
      done();
    };
    manager.purgeContainers(onRemove, onDone);
  });

  // Events
  b2d.events.on('post-up', function() {
    console.log(chalk.green('Kalabox has been activated.'));
  });

  b2d.events.on('post-down', function() {
    console.log(chalk.red('Kalabox has been deactivated.'));
  });
};
