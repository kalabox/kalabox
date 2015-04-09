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

  var createFrameworkFunc = function(task, frameworkModule) {
    if (typeof task !== 'object') {
      throw new TypeError('Invalid task object: ' + task);
    }
    if (typeof frameworkModule !== 'object') {
      throw new TypeError('Invalid frameworkModule: ' + frameworkModule);
    }

    // Add test option.
    task.options.push({
      name: 'test',
      alias: 't',
      description: 'Display list of steps instead of running steps.'
    });

    return function(done) {

      var config = kbox.core.deps.lookup('config');

      if (this.options.test) {
        var steps = frameworkModule.getSteps();
        steps.forEach(function(step) {
          console.log(step);
        });
        return done();
      }

      // Logging function.
      var log = kbox.core.log;

      // State to inject into install.
      var state = {
        adminCommands: [],
        config: config,
        downloads: [],
        containers: [],
        log: log,
        status: true
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
        // Logging stuff
        var totalSteps = state.stepCount;
        var stepNumberInfo = [stepIndex, totalSteps].join(':');
        var stepInfo = 'Starting ' + step.name;
        log.debug('[' + stepNumberInfo + '] ' + stepInfo);
        log.debug('description => ' + step.description);
        log.debug('dependencies => ' + step.deps.join(', '));
        log.info(chalk.cyan('-- Step ' + stepIndex + '/' + totalSteps + ' --'));
        log.info(chalk.grey(step.description));
        stepIndex += 1;
      });

      // Runs right after step.
      frameworkModule.events.on('post-step', function(step) {
        var now = getTime();
        var duration = now - stepStartTime;
        stepStartTime = now;
        if (state.status) {
          log.debug('Finished ' + step.name + ' (' + duration + ')');
          var progress = Math.round(((stepIndex - 1) / state.stepCount) * 100);
          var msg =
            chalk.cyan('-- ') + chalk.green('OK! ' + progress + '% complete!') +
             chalk.cyan(' --');
          log.info(msg);
        }
        else {
          log.info(chalk.cyan('-- ') + chalk.red('FAIL.') + chalk.cyan(' --'));
        }
        console.log('');
      });

      // Error.
      frameworkModule.events.on('error', function(err) {
        done(err);
      });

      // Install is done.
      frameworkModule.events.on('end', function(state) {
        log.info(chalk.green('Huzzah! Victory!'));
        done();
      });

      // Run the installer.
      frameworkModule.run(state);

    };
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
    outputContainers: outputContainers,
    createFrameworkFunc: createFrameworkFunc,
    runAdminCmds: runAdminCmds,
    prepareImages: prepareImages
  };

};
