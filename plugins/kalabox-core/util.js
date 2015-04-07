'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var async = require('async');
var chalk = require('chalk');
var _ = require('lodash');

module.exports = function(kbox) {

  var helpers = kbox.util.helpers;

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
  };

  var createFrameworkFunc = function(frameworkModule) {
    if (typeof frameworkModule !== 'object') {
      throw new TypeError('Invalid frameworkModule: ' + frameworkModule);
    }

    return function(done) {

      var argv = kbox.core.deps.lookup('argv');
      var config = kbox.core.deps.lookup('config');

      if (argv.t) {
        var steps = frameworkModule.getSteps();
        steps.forEach(function(step) {
          console.log(step);
        });
        return done();
      }

      // Logging function.
      var log = function(msg) {
        if (msg) {
          console.log('#### ' + msg + ' ####');
          //console.log(chalk.green('#### ' + msg + ' ####'));
        } else {
          console.log('');
        }
      };

      // State to inject into install.
      var state = {
        adminCommands: [],
        config: config,
        downloads: [],
        containers: [],
        log: console.log,
        status: {
          ok: chalk.green('OK'),
          notOk: chalk.red('NOT OK')
        }
      };

      // Add app object to state.
      kbox.whenApp(function(app) {
        state.app = app;
      });

      // Keep track of which step we are on.
      var stepIndex = 1;

      // Get the current time in milliseconds.
      var getTime = function() {
        return Date.now();
      };

      // Time the install started.
      var startTime = getTime();

      // Time the current step started.
      var stepStartTime = startTime;

      // Runs right before step.
      frameworkModule.events.on('pre-step', function(step) {
        var stepNumberInfo = [stepIndex, state.stepCount].join(':');
        var stepInfo = 'Starting ' + step.name;

        log('[' + stepNumberInfo + '] ' + stepInfo);
        log('description => ' + step.description);
        log('dependencies => ' + step.deps.join(', '));

        stepIndex += 1;
      });

      // Runs right after step.
      frameworkModule.events.on('post-step', function(step) {
        var now = getTime();
        var duration = now - stepStartTime;
        stepStartTime = now;

        log('Finished ' + step.name + ' (' + duration + ')');
        log();
      });

      // Error.
      frameworkModule.events.on('error', function(err) {
        done(err);
      });

      // Install is done.
      frameworkModule.events.on('end', function(state) {
        done();
      });

      // Run the installer.
      frameworkModule.run(state);

    };
  };

  var downloadFiles = function(downloads, callback) {
    // Validation.
    if (!Array.isArray(downloads)) {
      return callback(new TypeError('Invalid downloads: ' + downloads));
    }
    downloads.forEach(function(download, index) {
      if (typeof download !== 'string' || download.length < 1) {
        callback(new TypeError('Invalid download: index: ' + index +
          ' cmd: ' + download));
      }
    });
    // Download.
    if (downloads.length > 0) {
      var downloadDir = kbox.util.disk.getTempDir();
      downloads.forEach(function(url) {
        console.log([url, downloadDir].join(' -> '));
      });
      var downloadFiles = kbox.util.download.downloadFiles;
      downloadFiles(downloads, downloadDir, function(err) {
        if (err) {
          callback(err);
        } else {
          callback();
        }
      });
    }
    else {
      callback();
    }
  };

  var runAdminCmds = function(adminCommands, callback) {
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
      var child = kbox.install.cmd.runCmdsAsync(adminCommands);
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
                if (!info.running) {
                  kbox.engine.stop(info.id, function(err) {
                    if (err) {
                      done(err);
                    }
                    else {
                      kbox.engine.remove(info.id, function(err) {
                        if (err) {
                          done(err);
                        }
                        else {
                          console.log('Removed ' + info.name);
                          done();
                        }
                      });
                    }
                  });
                }
                else {
                  kbox.engine.remove(info.id, function(err) {
                    if (err) {
                      done(err);
                    }
                    else {
                      console.log('Removed ' + info.name);
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
    outputContainers: outputContainers,
    createFrameworkFunc: createFrameworkFunc,
    downloadFiles: downloadFiles,
    runAdminCmds: runAdminCmds,
    prepareImages: prepareImages
  };

};
