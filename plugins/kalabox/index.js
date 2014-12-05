'use strict';

var _ = require('lodash');
var chalk = require('chalk');
var plugin = require('../../lib/plugin.js');
var _ = require('lodash');
var chalk = require('chalk');
var plugin = require('../../lib/plugin.js');
var deps = require('../../lib/deps.js');
var installer = require('../../lib/install.js');

module.exports = function(plugin, manager) {

  // @todo: infinite timeout?
  manager.registerTask('install', 60 * 60 * 1000, function(done) {
    installer.run(done);
  });

  // @todo: not sure the status of these commands
  manager.registerTask('list', function(done) {
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

  manager.registerTask('pc', function(done) {
    var onRemove = function(data) {
      // container was removed
    };
    var onDone = function() {
      done();
    };
    manager.purgeContainers(onRemove, onDone);
  });

};
