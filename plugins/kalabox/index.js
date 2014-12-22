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

  // Display list of apps.
  tasks.registerTask('apps', function(done) {
    var apps = require('../../lib/apps.js');
    apps.getAppNames(function(err, appNames) {
      if (err) {
        done(err);
      } else {
        for (var index in appNames) {
          console.log(appNames[index]);
        }
        done();
      }
    });
  });

  // @todo: infinite timeout?
  // Installs the dependencies for kalabox to run
  tasks.registerTask('install', function(done) {
    installer.run(done);
  });

  // Prints out the config based on context
  tasks.registerTask('config', function(done) {
    var query = argv._[0];
    var target = globalConfig;
    if (query !== undefined) {
      target = target[query];
    }
    console.log(JSON.stringify(target, null, '\t'));
    done();
  });

  tasks.registerTask('list', function(done) {
    // --containers will show all built containers
    if (argv.containers) {
      manager.list(function(err, containers) {
        // @todo: pretty print this eventually
        console.log(containers);
      });
    }
    // --apps will show all built containers
    if (argv.apps) {
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
    }
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
