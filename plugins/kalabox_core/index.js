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
    var cmd = argv._;
    kbox.engine.once(image, '/bin/bash', {}, {}, function(container, done) {
      kbox.engine.query(container.id, cmd, function(err, stream) {
        if (err) {
          done(err);
        } else {
          stream.pipe(process.stdout);
          stream.on('end', function() {
            done();
          });
        }
      });
    },
    function(err) {
      done(err);
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

};
