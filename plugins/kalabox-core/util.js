'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var async = require('async');
var chalk = require('chalk');
var _ = require('lodash');

module.exports = function(kbox) {

  var helpers = kbox.util.helpers;

  /*
   * Return a list of all the names of apps kbox knows about.
   */
  var getAppNames = function() {

    // Get list of apps kbox knows about.
    return kbox.app.list()
    // Map apps to a list of app names and sort.
    .then(function(apps) {
      var appNames = _.map(apps, function(app) {
        return app.name;
      });
      appNames.sort();
      return appNames;
    });

  };

  /*
   * Return a list of containers for a given app name.
   */
  var getAppContainers = function(appName) {

    // Get list of containers for this app name.
    return kbox.engine.list(appName)
    // Map containers to container ids.
    .map(function(container) {
      return container.id;
    })
    // Map container ids to container infos.
    .map(function(containerId) {
      return kbox.engine.info(containerId);
    });

  };

  /*
   * Return an app stats object.
   */
  var getAppStats = function(appName) {

    // Starting object.
    var obj = {
      running: 0,
      total: 0
    };

    // Get app containers.
    return getAppContainers(appName)
    // Filter out data container.
    .filter(function(containerInfo) {
      var o = kbox.util.docker.containerName.parse(containerInfo.name);
      return o.name !== 'data';
    })
    // Reduce list of containers to a app stats object.
    .reduce(function(obj, containerInfo) {
      // Increment running.
      if (containerInfo.running) {
        obj.running += 1;
      }
      // Increment total.
      obj.total += 1;
      return obj;
    }, obj);

  };

  var outputContainers = function(app, done) {
    if (typeof app === 'function' && !done) {
      done = app;
      app = null;
    }

    var appName = null;
    if (app) {
      appName = app.name;
    }

    kbox.engine.list(appName, function(err, containers) {
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
                var split = info.name.split('_');
                var isData = (split[2] === 'data') ? true : false;
                if (!isData) {
                  console.log(JSON.stringify(info, null, '  '));
                }
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
  };

  var runAdminCmds = function(adminCommands, state, callback) {
    // Validation.
    if (!Array.isArray(adminCommands)) {
      return callback(new TypeError('Invalid adminCommands: ' + adminCommands));
    }

    adminCommands.forEach(function(adminCommand, index) {
      if (typeof adminCommand !== 'string' || adminCommand.length < 1) {
        callback(new TypeError('Invalid adminCommand index: ' + index +
          ' cmd: ' + adminCommand));
      }
    });

    // Process admin commands.
    if (adminCommands.length > 0) {
      var child = kbox.install.cmd.runCmdsAsync(adminCommands, state);
      child.stdout.on('data', function(data) {
        console.log(data);
      });
      child.stdout.on('end', function() {
        callback();
      });
      child.stderr.on('data', function(data) {
        // If we callback() here it fails on linux
        console.log(data);
      });
    } else {
      callback();
    }
  };

  var prepareImages = function(sContainers, callback) {
    kbox.engine.list(function(err, containers) {
      if (err) {
        callback(err);
      }
      else {
        helpers.mapAsync(
          containers,
          function(container, done) {
            if (_.include(sContainers, container.name)) {
              kbox.engine.info(container.id, function(err, info) {
                if (info.running) {
                  kbox.engine.stop(container.id, function(err) {
                    if (err) {
                      done(err);
                    }
                    else {
                      kbox.engine.remove(container.id, function(err) {
                        if (err) {
                          done(err);
                        }
                        else {
                          done();
                        }
                      });
                    }
                  });
                }
                else {
                  kbox.engine.remove(container.id, function(err) {
                    if (err) {
                      done(err);
                    }
                    else {
                      done();
                    }
                  });
                }
              });
            }
            else {
              done();
            }
          },
          function(errs) {
            if (err) {
              callback(err);
            }
            else {
              callback();
            }
          }
        );
      }
    });
  };

  return {
    getAppStats: getAppStats,
    getAppContainers: getAppContainers,
    getAppNames: getAppNames,
    outputContainers: outputContainers,
    runAdminCmds: runAdminCmds,
    prepareImages: prepareImages
  };

};
