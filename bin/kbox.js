#!/usr/bin/env node
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
//var app = require('../lib/app.js');
var manager = require('../lib/manager.js');

// set env var for ORIGINAL cwd
// before anything touches it
process.env.INIT_CWD = process.cwd();

var cli = new Liftoff({
  name: 'kalabox',
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

  var workingDir = env.configBase;
  var configPath = env.configPath;

  if (argv.app) {
    var apppath = path.resolve(kconfig.appDataPath, argv.app);
    if (!fs.existsSync(apppath) || !fs.existsSync(path.resolve(apppath, 'app.json'))) {
      console.log(chalk.red('App config not found.'));
      process.exit(1);
    }

    // Load up the app data from ~/.kalabox/apps/<app>/app.json
    var appdata = require(path.resolve(apppath, 'app.json'));
    console.log(appdata.path);
    workingDir = appdata.path;
    configPath = path.resolve(appdata.path, '.kalabox.json');
  }

  process.chdir(workingDir);

  if (!configPath) {
    console.log(chalk.red('No .kalabox.json file found.'));
    process.exit(1);
  }

  //env.config = require(env.configPath);
  //env.name = env.config.name;
  env.app = new manager.App(manager, workingDir);

  if (argv.verbose) {
    console.log(chalk.red('APP CONFIG:'), env.config);
    console.log('Using config file', chalk.magenta(tildify(env.configPath)));
  }

  processTask(env);
}

function processTask(env) {
  var cmd = argv._[0];
  if (env.app.tasks[cmd]) {
    env.app.tasks[cmd]();
  }
  else {
    console.log(chalk.red('Command'), chalk.cyan(cmd), chalk.red('not found.'));
  }
}