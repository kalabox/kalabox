#!/usr/bin/env node

'use strict';

/**
 * This file is meant to be linked as a "kbox" executable.
 */

var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var argv = require('minimist')(process.argv.slice(2));
var chalk = require('chalk');
var Liftoff = require('liftoff');
var tildify = require('tildify');

var kbox = require('../lib/kbox.js');
var config = kbox.core.config;
var deps = kbox.core.deps;
var env = kbox.core.env;
var tasks = kbox.core.tasks;

var manager = require('../lib/manager.js');
var App = require('../lib/app.js');
var _apps = require('../lib/apps.js');
var _util = require('../lib/util.js');
var b2d = require('../lib/b2d.js');

var init = function() {
  // argv
  deps.register('argv', argv);
  // manager
  deps.register('manager', manager);
  // tasks
  tasks.init();
  deps.register('tasks', tasks);
  // globalConfig
  var globalConfig = config.getGlobalConfig();
  deps.register('globalConfig', globalConfig);
  deps.register('config', globalConfig);
  // manager
  manager.setup();
};

var initWithApp = function(app) {
  // appConfig
  var appConfig = config.getAppConfig(app);
  deps.register('appConfig', appConfig);
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

function logError(err) {
  console.log(chalk.red(err.message));
}

function processTask(env) {
  // Get dependencies.
  deps.call(function(tasks) {
    // Replace app with the app name.
    if (argv._[0] === 'app' && env.app) {
      argv._[0] = env.app.name;
    }
    // Map taskName to task function.
    var result = tasks.getTask(argv._);
    if (!result || !result.task || !result.task.task) {
      tasks.prettyPrint(result.task);
    } else {
      argv._ = result.args;
      result.task.task(function(err) {
        if (err) {
          throw err;
        }
      });
    }
  });
}

function handleArguments(env) {
  if (argv.verbose) {
    console.log(chalk.yellow('CLI OPTIONS:'), argv);
    console.log(chalk.yellow('CWD:'), env.cwd);
    console.log(chalk.red('APP CONFIG LOCATION:'),  env.configPath);
    console.log(chalk.red('APP CONFIG BASE DIR:'), env.configBase);
    console.log(chalk.cyan('KALABOX PACKAGE.JSON'), require('../package'));
  }

  var workingDir = env.cwd;
  var configPath = path.join(env.cwd, '.kalabox', 'profile.json');

  // Init dependencies.
  init();

  _apps.getAppNames(function(err, appNames) {

    // Setup all the apps.
    var apps = {};
    appNames.forEach(function(appName) {
      var appConfig = config.getAppConfig({name: appName});
      apps[appName] = new App(appName, appConfig);
      apps[appName].setup();
    });

    // Load target app.
    var appArgument = argv._[0];
    var appToLoad = _util.helpers.find(appNames, function(appName) {
      return appName === appArgument;
    });
    if (appToLoad !== null) {
      env.app = apps[appToLoad];
      initWithApp(env.app);
    }

    try {
      // Run the task.
      processTask(env);
    } catch (err) {
      // Log error.
      logError(err);
    }
  });

  env.manager = manager;

  if (argv.verbose) {
    console.log(chalk.red('APP CONFIG:'), env.config);
    console.log('Using config file', chalk.magenta(tildify(env.configPath)));
  }
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
