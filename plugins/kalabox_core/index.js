'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var _ = require('lodash');
var chalk = require('chalk');
var async = require('async');

var B2D_UP_ATTEMPTS = 3;
var B2D_DOWN_ATTEMPTS = 3;
var B2D_STATUS_ATTEMPTS = 3;
var B2D_IP_ATTEMPTS = 3;

module.exports = function(argv, plugin, kbox) {

  var tasks = kbox.core.tasks;

  // @todo: remove
  tasks.registerTask('test', function(done) {
    var image = 'kalabox/syncthing:stable';
    var cmd = '/bin/ls';
    kbox.engine.queryString(image, cmd, {}, {}, function(err, data) {
      if (err) {
        throw err;
      } else {
        console.log(data);
      }
    });
  });

  tasks.registerTask('ip', function(done) {
    kbox.engine.provider.getIp(function(err, ip) {
      if (err) {
        done(err);
      } else {
        console.log(ip);
        done();
      }
    });
  });

  // Display list of dependencies.
  tasks.registerTask('deps', function(done) {
    var keys = kbox.core.deps.keys().sort();
    _.each(keys, function(key) {
      console.log(key);
    });
    done();
  });

  // Display list of apps.
  tasks.registerTask('apps', function(done) {
    kbox.app.list(function(err, apps) {
      if (err) {
        done(err);
      } else {
        var appNames = [];
        _.forEach(apps, function(app) {
          appNames.push(app.name);
        });
        appNames.sort();
        _.forEach(appNames, function(appName) {
          console.log(appName);
        });
        done();
      }

    });
  });

  // Display list of containers.
  tasks.registerTask('containers', function(done) {
    kbox.engine.list(function(err, containers) {
      if (err) {
        done(err);
      } else {
        async.each(containers,
        function(container, next) {
          kbox.engine.info(container.id, function(err, info) {
            if (err) {
              next(err);
            } else {
              if (info) {
                console.log(JSON.stringify(info, null, '  '));
              }
              next();
            }
          });
        },
        function(err) {
          done(err);
        });
      }
    });
  });

  // Prints out the config based on context
  tasks.registerTask('config', function(done) {
    var query = argv._[0];
    var target = kbox.core.config.getGlobalConfig();
    if (query !== undefined) {
      target = target[query];
    }
    console.log(JSON.stringify(target, null, '\t'));
    done();
  });

  // Display status of provider.
  tasks.registerTask('status', function(done) {
    kbox.engine.provider.isUp(function(err, isUp) {
      if (err) {
        done(err);
      } else if (isUp) {
        console.log('up');
      } else {
        console.log('down');
      }
    });
  });

  /*tasks.registerTask('list', function(done) {
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
  });*/

  // @todo: Do we need this? If so should it be in engine or app?
  /*tasks.registerTask('pc', function(done) {
    var onRemove = function(data) {
      // container was removed
    };
    var onDone = function() {
      done();
    };
    manager.purgeContainers(onRemove, onDone);
  });*/

};
