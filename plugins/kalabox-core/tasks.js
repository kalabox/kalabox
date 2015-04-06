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

module.exports = function(kbox) {

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

  /*
   * TASKS THAT DO NOT NEED THE APP OBJECT.
   */

  // Display list of apps.
  kbox.tasks.add(function(task) {
    task.path = ['apps'];
    task.description = 'Display list of apps.';
    task.func = function(done) {
      kbox.app.list(function(err, apps) {
        if (err) {
          done(err);
        } else {
          var appNames = _.map(apps, function(app) {
            return app.name;
          });
          appNames.sort();
          _.forEach(appNames, function(appName) {
            console.log(appName);
          });
          done();
        }
      });
    };
  });

  // Display list of containers.
  kbox.tasks.add(function(task) {
    task.path = ['containers'];
    task.description = 'Display list of all installed kbox containers.';
    task.func = function(done) {
      outputContainers(done);
    };
  });

  // Prints out the config.
  kbox.tasks.add(function(task) {
    task.path = ['config'];
    task.description = 'Display the kbox configuration.';
    task.func = function() {
      var config = kbox.core.config.getGlobalConfig();
      console.log(JSON.stringify(config, null, '  '));
    };
  });

  // Prints out the kbox version.
  kbox.tasks.add(function(task) {
    task.path = ['version'];
    task.description = 'Display the kbox version.';
    task.func = function() {
      console.log(kbox.core.config.getGlobalConfig().version);
    };
  });

  var createFrameworkFunc = function(task, frameworkModule) {
    if (typeof frameworkModule !== 'object') {
      throw new TypeError('Invalid frameworkModule: ' + frameworkModule);
    }

    // Provide an option for viewing install steps instead of running them.
    task.options = [
      ['t', 'test', 'Display list of steps.']
    ];

    return function(done) {

      var argv = kbox.core.deps.lookup('argv');
      var config = kbox.core.deps.lookup('config');

      if (this.options.test) {
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

  // Update task.
  kbox.tasks.add(function(task) {
    task.path = ['update'];
    task.description = 'Update kbox and it\'s dependencies.';
    task.func = createFrameworkFunc(task, kbox.update);
  });

  // Provision task.
  kbox.tasks.add(function(task) {
    task.path = ['provision'];
    task.description = 'Install kbox and it\'s dependencies.';
    task.func = createFrameworkFunc(task, kbox.install);
  });

  /*
   * TASKS THAT **DO** NEED THE APP OBJECT.
   */

  kbox.whenApp(function(app) {

    // Update task.
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'update'];
      task.description = 'Update application and it\'s dependencies.';
      task.func = createFrameworkFunc(task, kbox.update);
    });

    kbox.tasks.add(function(task) {
      task.path = [app.name, 'install'];
      task.description = 'Install a kbox application.';
      task.func = function(done) {
        kbox.app.install(app, done);
      };
    });

    kbox.tasks.add(function(task) {
      task.path = [app.name, 'uninstall'];
      task.description = 'Uninstall an installed kbox application';
      task.func = function(done) {
        kbox.app.uninstall(app, done);
      };
    });

    kbox.tasks.add(function(task) {
      task.path = [app.name, 'start'];
      task.description = 'Start an installed kbox application.';
      task.func = function(done) {
        kbox.app.start(app, done);
      };
    });

    kbox.tasks.add(function(task) {
      task.path = [app.name, 'stop'];
      task.description = 'Stop a running kbox application.';
      task.func = function(done) {
        kbox.app.stop(app, done);
      };
    });

    kbox.tasks.add(function(task) {
      task.path = [app.name, 'restart'];
      task.description = 'Stop and then start a running kbox application.';
      task.func = function(done) {
        kbox.app.restart(app, done);
      };
    });

    kbox.tasks.add(function(task) {
      task.path = [app.name, 'config'];
      task.description = 'Display the kbox application\'s configuration.';
      task.func = function() {
        console.log(JSON.stringify(app.config, null, '  '));
      };
    });

    kbox.tasks.add(function(task) {
      task.path = [app.name, 'containers'];
      task.description =
        'Display list of application\'s installed containers.';
      task.func = function(done) {
        outputContainers(app, done);
      };
    });

    kbox.tasks.add(function(task) {
      task.path = [app.name, 'inspect'];
      task.description = 'Inspect containers.';
      task.allowArgv = true;
      task.func = function(done) {
        var targets = this.argv;
        kbox.engine.list(app.name, function(err, containers) {
          if (err) {
            done(err);
          } else {
            // Map argv to containers.
            targets = _.map(targets, function(target) {
              var result = _.find(containers, function(container) {
                return container.name === target;
              });
              if (!result) {
                done(new Error('No container named: ' + target));
              } else {
                return result;
              }
            });
            // Inspect each container and output data.
            async.eachSeries(targets,
            function(target, next) {
              kbox.engine.inspect(target.id, function(err, data) {
                if (err) {
                  next(err);
                } else {
                  console.log(data);
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
    });

  });

};
