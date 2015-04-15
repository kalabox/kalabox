#!/usr/bin/env node

'use strict';

/**
 * This file is meant to be linked as a "kbox" executable.
 */

var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var S = require('string');
var async = require('async');
var chalk = require('chalk');
var Liftoff = require('liftoff');
var tildify = require('tildify');

var kbox = require('../lib/kbox.js');
var assert = require('assert');
var config = kbox.core.config;
var deps = kbox.core.deps;
var env = kbox.core.env;
var tasks = kbox.core.tasks;
var _util = kbox.util;
var shell = kbox.util.shell;

// Partition and parse argv.
var argv = kbox.tasks.partitionArgv(process.argv.slice(2));

var initPlugins = function(globalConfig, callback) {
  var plugins = globalConfig.globalPlugins;
  async.eachSeries(plugins, function(plugin, next) {
    kbox.require(plugin, next);
  },
  function(err) {
    callback(err);
  });
};

var init = function(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Invalid callback function');
  }

  // globalConfig
  var globalConfig = config.getGlobalConfig();
  deps.register('globalConfig', globalConfig);
  deps.register('config', globalConfig);
  // argv
  deps.register('argv', argv);
  deps.register('verbose', argv.options.verbose);
  // require
  deps.register('kboxRequire', kbox.require);
  // mode
  deps.register('mode', kbox.core.mode.set('cli'));
  // shell
  deps.register('shell', shell);
  // kbox
  deps.register('kbox', kbox);
  // events
  deps.register('events', kbox.core.events);
  kbox.engine.init(globalConfig, function(err) {
    if (err) {
      return callback(err);
    }

    kbox.services.init(globalConfig, kbox, function(err) {
      if (err) {
        return callback(err);
      }

      deps.register('services', kbox.services);
      deps.register('engine', kbox.engine);
      callback(null, globalConfig);
    });
  });
};

var initWithApp = function(app) {
  // appConfig
  deps.register('appConfig', app.config);
  // app
  deps.register('app', app);
};

// set env var for ORIGINAL cwd before anything touches it
process.env.INIT_CWD = process.cwd();

var cli = new Liftoff({
  name: 'profile',
  configName: '.kalabox',
  extensions: {
    '.json': null
  },
  modulePath: path.resolve(__dirname, '../'),
  modulePackage: path.resolve(__dirname, '../package.json')
});

// exit with 0 or 1
var failed = false;
process.once('exit', function(code) {
  if (code === 0 && failed) {
    process.exit(1);
  }
});

var cliPackage = require('../package');
//var versionFlag = argv.v || argv.version;
//var tasksFlag = argv.T || argv.tasks;

/*
 * Handler errors.
 */
function handleError(err) {

  // Print error message.
  console.log(chalk.red(err.message));

  if (argv.options.verbose) {

    // When verbose output, also print stack trace.
    console.log(chalk.red(err.stack));

  }

  // Log error.
  kbox.core.log.error(err, function() {

    // Exit the process with a failure.
    process.exit(1);

  });

}

function getAppContextFromArgv(apps, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Invalid callback function: ' + callback);
  }

  callback(null, _.find(apps, function(app) {
    return app.name === argv.payload[0];
  }));
}

function getAppContextFromCwd(apps, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Invalid callback function: ' + callback);
  }

  var cwd = S(process.cwd());
  callback(null, _.find(apps, function(app) {
    var appRoot = app.config.appRoot;
    return cwd.startsWith(appRoot);
  }));
}

function getAppContextFromCwdConfig(apps, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Invalid callback function: ' + callback);
  }

  var cwd = process.cwd();
  var configFilepath = path.join(cwd, 'kalabox.json');
  if (fs.existsSync(configFilepath)) {
    var config = kbox.core.config.getAppConfig(null, cwd);
    kbox.app.create(config.appName, config, function(err, app) {
      callback(err, app);
    });
  } else {
    callback(null);
  }
}

function getAppContext(apps, callback) {
  // Find the app context.
  var funcs = [
    getAppContextFromArgv,
    getAppContextFromCwd,
    getAppContextFromCwdConfig
  ];
  async.reduce(funcs, null, function(answer, func, next) {
    if (answer) {
      next(null, answer);
    } else {
      func(apps, function(err, result) {
        next(err, result);
      });
    }

  },
  function(err, appContext) {
    if (err) {
      callback(err);
    }
    else {
      callback(err, appContext);
    }
  });
}

/*
 * Find the correct cli task and run it.
 */
function processTask(app) {

  // Search for a task with the app name.
  var appResult = (function() {
    if (!app) {
      return null;
    } else if (argv.payload.length === 0) {
      return null;
    } else {
      var appPayload = argv.payload.slice(0);
      if (!_.contains(appPayload, app.name)) {
        appPayload.unshift(app.name);
      }
      return kbox.tasks.find({
        payload: appPayload,
        options: argv.options,
        rawOptions: argv.rawOptions
      });
    }
  })();

  // Search for a task without the app name.
  var globalResult = kbox.tasks.find(argv);

  // Is there a conflict between an app task and a global task?
  var conflict = !!appResult && !!globalResult;

  // For now just use the app result if it exists.
  var result = (function() {
    if (appResult) {
      return appResult;
    } else {
      return globalResult;
    }
  })();

  if (!result) {

    // We ended up with a branch, so display task tree.
    kbox.tasks.showMenu(kbox.tasks.getTaskTree(), app);

  } else if (kbox.tasks.isBranch(result)) {

    // We ended up with a branch, so display task tree.
    kbox.tasks.showMenu(result, app);

  } else if (kbox.tasks.isTask(result)) {

    // We found a task, so run it.
    kbox.tasks.run(result, function(err) {

      // Whoops an error happened.
      if (err) {
        handleError(err);
      }

    });

  } else {

    // This should never happen.
    assert(false);

  }
}

function handleArguments(env) {
  var workingDir = env.cwd;
  var configPath = path.join(env.cwd, '.kalabox', 'profile.json');

  // Init dependencies.
  init(function(err, globalConfig) {
    if (err) {
      return handleError(err);
    }

    // Get full list of registered apps.
    kbox.app.list(function(err, apps) {
      if (err) {
        return handleError(err);
      }

      // Find the app context if there is one.
      getAppContext(apps, function(err, appContext) {
        if (err) {
          return handleError(err);
        }

        // Register the app context as a dependency.
        if (appContext) {
          env.app = appContext;
          initWithApp(appContext);
        }

        // Init global plugins.
        initPlugins(globalConfig, function(err) {
          if (err) {

            handleError(err);

          } else {

            if (appContext) {

              // Load app plugins for the app context app.
              kbox.app.loadPlugins(appContext, function(err) {
                if (err) {

                  handleError(err);

                } else {

                  // Run the task.
                  processTask(appContext);

                }
              });

            } else {

              // Run the task.
              processTask();

            }

          }
        });

      });
    });
  });

}

cli.on('require', function(name) {
  console.log('Requiring external module', chalk.magenta(name));
});

cli.on('requireFail', function(name) {
  console.log(chalk.red('Failed to load external module'), chalk.magenta(name));
});

cli.launch({
  cwd: argv.cwd,
  configPath: argv.kalaboxfile,
  require: argv.require,
  completion: argv.completion,
  verbose: argv.verbose,
  app: argv.app
}, handleArguments);
