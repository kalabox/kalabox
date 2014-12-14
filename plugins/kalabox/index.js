'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var _ = require('lodash');
var chalk = require('chalk');
var plugin = require('../../lib/plugin.js');
var deps = require('../../lib/deps.js');
var installer = require('../../lib/install.js');

var B2D_UP_ATTEMPTS = 3;
var B2D_DOWN_ATTEMPTS = 3;
var B2D_STATUS_ATTEMPTS = 3;
var B2D_IP_ATTEMPTS = 3;

module.exports = function(argv, globalConfig, manager, plugin, tasks) {

  // Tasks
  // Installs the dependencies for kalabox to run
  tasks.registerTask('install', function(done) {
    installer.run(done);
  });

  // Prints out the config based on context
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

};
