'use strict';

var _ = require('lodash');
var chalk = require('chalk');
var plugin = require('../../lib/plugin.js');
var deps = require('../../lib/deps.js');
var installer = require('../../lib/install.js');

var B2D_UP_TIMEOUT = 120 * 1000;
var B2D_DOWN_TIMEOUT = 60 * 1000;
var KBOX_INSTALL_TIMEOUT = 60 * 60 * 1000;

module.exports = function(b2d, plugin, manager, tasks, docker, kConfig) {

  // @todo: infinite timeout?
  manager.registerTask('install', KBOX_INSTALL_TIMEOUT, function(done) {
    installer.run(done);
  });

  // Start the kalabox VM and our core containers
  manager.registerTask('up', B2D_UP_TIMEOUT, function(done) {
    b2d.up(done);
  });
  manager.registerTask('down', B2D_DOWN_TIMEOUT, function(done) {
    b2d.down(done);
  });

  // Get the UP address of the kalabox vm
  manager.registerTask('ip', function(done) {
    b2d.ip(function(err, ip) {
      if (err) {
        throw err;
      } else {
        console.log(ip);
        done();
      }
    });
  });

  // Check status of kbox
  manager.registerTask('status', function(done) {
    b2d.status(function(status) {
      console.log(status);
      done();
    });
  });

  tasks.registerTask('config', function(done) {
    var globalConfig = kConfig.getGlobalConfig();
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
