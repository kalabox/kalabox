'use strict';

var _ = require('lodash');
var chalk = require('chalk');

module.exports = function(plugin, manager) {
  manager.registerTask('list', function() {
    var i = 1;
    manager.getApps(function(apps) {
      console.log('');

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
  });

  manager.registerTask('pc', function() {
    manager.purgeContainers(function(data) {
    });
  });
};
