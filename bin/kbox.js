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

var kconfig = require('../lib/config.js');
var manager = require('../lib/manager.js');
var App = require('../lib/app.js');
var deps = require('../lib/deps.js');

// set env var for ORIGINAL cwd
// before anything touches it
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
var tasks = argv._;
var toRun = tasks.length ? tasks : ['default'];

cli.on('require', function (name) {
  console.log('Requiring external module', chalk.magenta(name));
});

cli.on('requireFail', function (name) {
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

function handleArguments(env) {
  if (argv.verbose) {
    console.log(chalk.yellow('LIFTOFF SETTINGS:'), this);
    console.log(chalk.yellow('CLI OPTIONS:'), argv);
    console.log(chalk.yellow('CWD:'), env.cwd);
    console.log(chalk.red('APP CONFIG LOCATION:'),  env.configPath);
    console.log(chalk.red('APP CONFIG BASE DIR:'), env.configBase);
    console.log(chalk.cyan('KALABOX MODULE LOCATION:'), this.modulePath);
    console.log(chalk.cyan('KALABOX PACKAGE.JSON LOCATION:'), this.modulePackage);
    console.log(chalk.cyan('KALABOX PACKAGE.JSON'), require('../package'));
  }

  var workingDir = env.cwd;
  var configPath = path.join(env.cwd, '.kalabox', 'profile.json');

  if (argv.app) {
    var apppath = path.resolve(kconfig.appDataPath, argv.app);
    if (!fs.existsSync(apppath) || !fs.existsSync(path.resolve(apppath, 'app.json'))) {
      console.log(chalk.red('App config not found.'));
      process.exit(1);
    }

    // Load up the app data from ~/.kalabox/apps/<app>/app.json
    var appdata = require(path.resolve(apppath, 'app.json'));
    workingDir = appdata.path;
    configPath = path.resolve(appdata.profilePath, 'profile.json');
  }

  if (fs.existsSync(configPath)) {
    process.chdir(workingDir);
    env.app = new App(manager, workingDir);
  }

  env.manager = manager;

  if (argv.verbose) {
    console.log(chalk.red('APP CONFIG:'), env.config);
    console.log('Using config file', chalk.magenta(tildify(env.configPath)));
  }

  try {
    // Run the task.
    processTask(env);
  } catch (err) {
    // Log error.
    logError(err);
  }
}

function logError(err) {
  console.log(chalk.red(err.message));
}

function processTask(env) {
  // Get dependencies.
  deps.call(function(manager) {
    // Map taskName to task function.
    var taskName = argv._[0];
    var task = manager.tasks[taskName];
    if (task) {
      // Run task function.
      task();
    } else {
      // Task not found.
      throw new Error('Command "' + taskName + '" NOT found!');
    }
  });
}
