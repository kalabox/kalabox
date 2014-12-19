'use strict';

var _ = require('lodash');
var chalk = require('chalk');
var plugin = require('../../lib/plugin.js');
var deps = require('../../lib/deps.js');
var installer = require('../../lib/install.js');

module.exports = function(argv, b2d, globalConfig, manager, plugin, tasks) {

  tasks.registerTask('apps', function(done) {
    var apps = require('../../lib/apps.js');
    apps.getApps(function(err, apps) {
      if (err) {
        done(err);
      } else {
        for (var index in apps) {
          console.log(apps[index]);
        }
        done();
      }
    });
  });

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
    var query = argv._[0];
    var target = globalConfig;
    if (query !== undefined) {
      target = target[query];
    }
    console.log(JSON.stringify(target, null, '\t'));
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
