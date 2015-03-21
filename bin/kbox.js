#!/usr/bin/env node

'use strict';

/**
 * This file is meant to be linked as a "kbox" executable.
 */

var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var S = require('string');
var argv = require('minimist')(process.argv.slice(2));
var async = require('async');
var chalk = require('chalk');
var Liftoff = require('liftoff');
var tildify = require('tildify');

var kbox = require('../lib/kbox.js');
var config = kbox.core.config;
var deps = kbox.core.deps;
var env = kbox.core.env;
var tasks = kbox.core.tasks;
var _util = kbox.util;
var shell = kbox.util.shell;

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
  // argv
  deps.register('argv', argv);
  // tasks
  tasks.init();
  deps.register('tasks', tasks);
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
      initPlugins(globalConfig, callback);

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
var versionFlag = argv.v || argv.version;
var tasksFlag = argv.T || argv.tasks;

function handleError(err) {
  var cancel = false;
  // This is just in case logging module has an issue.
  var timer = setTimeout(function() {
    if (!cancel) {
      throw err;
    }
  }, 5000);
  // Log error.
  kbox.core.log.error(err, function() {
    // Cancel safety timer and throw err.
    cancel = true;
    clearTimeout(timer);
    throw err;
  });
}

function processTask(env) {
  // Get dependencies.
  deps.call(function(tasks) {
    // Get app specific task.
    var appTask = (function() {
      if (!env.app) {
        return null;
      } else {
        var args = argv._.slice();
        if (args[0] !== env.app.name) {
          args.unshift(env.app.name);
        }
        return tasks.getTask(args);
      }
    })();
    // Get global task.
    var globalTask = (function() {
      var args = argv._.slice();
      if (env.app && args[0] === env.app.name) {
        return null;
      } else {
        return tasks.getTask(args);
      }
    })();
    // Figure out if the app specific task or the global task should be used.
    var result = (function() {
      var result = {
        task: null,
        hasGlobalConflict: false,
        args: null
      };
      if (appTask && appTask.task.task && globalTask && globalTask.task.task) {
        if (argv.g) {
          result.task = globalTask.task;
          result.args = globalTask.args;
        } else {
          result.task = appTask.task;
          result.hasGlobalConflict = true;
          result.args = appTask.args;
        }
      } else if (appTask) {
        result.task = appTask.task;
        result.args = appTask.args;
      } else if (globalTask) {
        result.task = globalTask.task;
        result.args = globalTask.args;
      }
      return result;
    })();
    // Display menu choices or run task.
    if (!result || !result.task || !result.task.task) {
      tasks.prettyPrint(result.task);
      process.exit(1);
    } else {
      argv._ = result.args;
      result.task.task(function(err) {
        if (err) {
          handleError(err);
        }
      });
    }
  });
}

function getAppContextFromArgv(apps, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Invalid callback function: ' + callback);
  }

  callback(null, _.find(apps, function(app) {
    return app.name === argv._[0];
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

function ensureAppNodeModulesInstalled(app, callback) {
  var appRoot = app.config.appRoot;
  var packageFilepath = path.join(appRoot, 'package.json');
  fs.exists(packageFilepath, function(packageFileExists) {
    if (packageFileExists) {
      fs.readFile(packageFilepath, function(err, data) {
        if (err) {
          callback(err);
        } else {
          var json = JSON.parse(data);
          if (json.dependencies) {
            var depCount = _.reduce(json.dependencies, function(count, x) {
              return count += 1;
            }, 0);
            if (depCount > 0) {
              var nodeModulesDir = path.join(appRoot, 'node_modules');
              fs.exists(nodeModulesDir, function(nodeModulesDirExists) {
                if (!nodeModulesDirExists) {
                  kbox.app.installPackages(appRoot, callback);
                } else {
                  callback();
                }
              });
            } else {
              callback();
            }
          } else {
            callback();
          }
        }
      });
    } else {
      callback();
    }
  });
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
  function (err, appContext) {
    if (err) {
      callback(err);
    } else if (appContext) {
      // If there is an app context, make sure it's node modules are installed.
      ensureAppNodeModulesInstalled(appContext, function(err) {
        callback(err, appContext);
      });
    } else {
      callback();
    }
  });
}

function handleArguments(env) {
  var workingDir = env.cwd;
  var configPath = path.join(env.cwd, '.kalabox', 'profile.json');

  // Init dependencies.
  init(function(err) {
    if (err) {
      return handleError(err);
    }

    kbox.app.list(function(err, apps) {
      if (err) {
        return handleError(err);
      }

      getAppContext(apps, function(err, appContext) {
        if (err) {
          return handleError(err);
        }

        if (appContext) {
          env.app = appContext;
          initWithApp(appContext);
        }

        try {
          // Run the task.
          processTask(env);
        } catch (err) {
          return handleError(err);
        }
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
