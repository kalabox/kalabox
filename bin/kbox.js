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

var packages = {
  share : require('../lib/share/sharePackage.js')
};

var init = function() {
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
  // globalConfig
  var globalConfig = config.getGlobalConfig();
  deps.register('globalConfig', globalConfig);
  deps.register('config', globalConfig);
  // engine
  kbox.engine.init(globalConfig);
  deps.register('engine', kbox.engine);
  // services
  kbox.services.init(globalConfig);
  deps.register('services', kbox.services);
  // plugins
  kbox.core.plugin.init(globalConfig);
  // Packages
  for (var pkg in packages) {
    packages[pkg].init();
  }
};

var initWithApp = function(app) {
  // appConfig
  deps.register('appConfig', app.config);
  // app
  deps.register('app', app);
  kbox.app.loadPlugins(app);
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

function logError(err) {
  console.log(chalk.red(err.message));
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
    } else {
      argv._ = result.args;
      result.task.task(function(err) {
        if (err) {
          throw(err);
        }
      });
    }
  });
}

function getAppContextFromArgv(apps) {
  return _.find(apps, function(app) {
    return app.name === argv._[0];
  });
}

function getAppContextFromCwd(apps) {
  var cwd = process.cwd();
  return _.find(apps, function(app) {
    return S(cwd).startsWith(app.config.appRoot);
  });
}

function getAppContextFromCwdConfig(apps) {
  var cwd = process.cwd();
  var configFilepath = path.join(cwd, 'kalabox.json');
  if (fs.existsSync(configFilepath)) {
    var config = kbox.core.config.getAppConfig(null, cwd);
    return kbox.app.create(config.appName, config);
  } else {
    return null;
  }
}

function ensureAppNodeModulesInstalled(app, callback) {
  var appRoot = app.config.appRoot;
  var packageFilepath = path.join(appRoot, 'package.json');
  fs.exists(packageFilepath, function(packageFileExists) {
    if (packageFileExists) {
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
  });
}

function getAppContext(apps, callback) {
  // Find the app context.
  var funcs = [
    getAppContextFromArgv,
    getAppContextFromCwd,
    getAppContextFromCwdConfig
  ];
  var appContext = _.reduce(funcs, function(answer, func) {
    if (answer) {
      return answer;
    } else {
      return func(apps);
    }
  }, null);

  // If there is an app context, make sure it's node modules are installed.
  if (appContext) {
    ensureAppNodeModulesInstalled(appContext, function(err) {
      callback(err, appContext);
    });
  } else {
    callback();
  }
}

function handleArguments(env) {
  var workingDir = env.cwd;
  var configPath = path.join(env.cwd, '.kalabox', 'profile.json');

  // Init dependencies.
  init();

  kbox.app.list(function(err, apps) {
    if (err) {
      throw err;
    }

    getAppContext(apps, function(err, appContext) {
      if (err) {
        throw err;
      }

      if (appContext) {
        env.app = appContext;
        initWithApp(appContext);
      }

      try {
        // Run the task.
        processTask(env);
      } catch (err) {
        // Log error.
        logError(err);
      }
    });
  });
}

function logError(err) {
  console.log(chalk.red(err.message));
  throw err;
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
