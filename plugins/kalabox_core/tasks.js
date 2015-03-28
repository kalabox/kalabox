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

  var tasks = kbox.core.tasks;
  var argv = kbox.core.deps.lookup('argv');

  var outputConfig = function(config, done) {
    var query = argv._[0];
    var target = config;
    if (query) {
      target = target[query];
    }
    console.log(JSON.stringify(target, null, '\t'));
    done();
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
    outputContainers(done);
  });

  // Prints out the config based on context
  tasks.registerTask('config', function(done) {
    var config = kbox.core.config.getGlobalConfig();
    outputConfig(config, done);
  });

  // Prints out the kbox version.
  tasks.registerTask('version', function(done) {
    console.log(kbox.core.config.getGlobalConfig().version);
    done();
  });

  // Installs the dependencies for kalabox to run
  kbox.core.tasks.registerTask('provision', function(done) {

    var argv = kbox.core.deps.lookup('argv');
    var config = kbox.core.deps.lookup('config');

    // Logging function.
    var log = function(msg) {
      if (msg) {
        console.log('#### ' + msg + ' ####');
        //console.log(chalk.green('#### ' + msg + ' ####'));
      } else {
        console.log('');
      }
    };

    // Test provision, just print out step info.
    if (argv.t) {
      var steps = kbox.install.getSteps();
      // Output each step to console.
      steps.forEach(function(step) {
        console.log(step);
      });
      // Return.
      return done();
    }

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
    kbox.install.events.on('pre-step', function(step) {
      var stepNumberInfo = [stepIndex, state.stepCount].join(':');
      var stepInfo = 'Starting ' + step.name;

      log('[' + stepNumberInfo + '] ' + stepInfo);
      log('description => ' + step.description);
      log('dependencies => ' + step.deps.join(', '));

      stepIndex += 1;
    });

    // Runs right after step.
    kbox.install.events.on('post-step', function(step) {
      var now = getTime();
      var duration = now - stepStartTime;
      stepStartTime = now;

      log('Finished ' + step.name + ' (' + duration + ')');
      log();
    });

    // Error.
    kbox.install.events.on('error', function(err) {
      done(err);
    });

    // Install is done.
    kbox.install.events.on('end', function(state) {
      done();
    });

    // Run the installer.
    kbox.install.run(state);

  });

  /*
   * TASKS THAT **DO** NEED THE APP OBJECT.
   */

  kbox.whenApp(function(app) {

    tasks.registerTask([app.name, 'install'], function(done) {
      kbox.app.install(app, done);
    });

    tasks.registerTask([app.name, 'uninstall'], function(done) {
      kbox.app.uninstall(app, done);
    });

    tasks.registerTask([app.name, 'start'], function(done) {
      kbox.app.start(app, done);
    });

    tasks.registerTask([app.name, 'stop'], function(done) {
      kbox.app.stop(app, done);
    });

    tasks.registerTask([app.name, 'restart'], function(done) {
      kbox.app.restart(app, done);
    });

    tasks.registerTask([app.name, 'config'], function(done) {
      outputConfig(app.config, done);
    });

    tasks.registerTask([app.name, 'containers'], function(done) {
      outputContainers(app, done);
    });

    tasks.registerTask([app.name, 'inspect'], function(done) {
      var targetName = argv._[0];
      kbox.engine.list(app.name, function(err, containers) {
        if (err) {
          done(err);
        } else {
          var target = _.find(containers, function(container) {
            return container.name === targetName;
          });
          if (target === undefined) {
            done(new Error('No item named "' + targetName + '" found!'));
          } else {
            kbox.engine.inspect(target.id, function(err, data) {
              if (err) {
                done(err);
              } else {
                console.log(data);
                done();
              }
            });
          }
        }
      });
    });

  });

};
