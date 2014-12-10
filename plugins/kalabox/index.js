'use strict';

var _ = require('lodash');
var chalk = require('chalk');
var plugin = require('../../lib/plugin.js');
var deps = require('../../lib/deps.js');
var installer = require('../../lib/install.js');

module.exports = function(b2d, plugin, manager, tasks, docker, kConfig) {

  // @todo: infinite timeout?
  tasks.registerTask('install', function(done) {
    installer.run(done);
  });

  // Start the kalabox VM and our core containers
  tasks.registerTask('up', function(done) {
    b2d.up(done);
  });
  tasks.registerTask('down', function(done) {
    b2d.down(done);
  });

  // Get the UP address of the kalabox vm
  tasks.registerTask('ip', function(done) {
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
  tasks.registerTask('status', function(done) {
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
