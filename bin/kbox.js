#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var argv = require('minimist')(process.argv.slice(2));
var chalk = require('chalk');
var Liftoff = require('liftoff');
var tildify = require('tildify');

var am = require('../lib/appmanager.js');
var config;

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
  verbose: argv.verbose
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

  if (!env.configPath) {
    console.log(chalk.red('No .kalabox file found.'));
    process.exit(1);
  }

  if (process.cwd() !== env.cwd) {
    process.chdir(env.cwd);
    console.log(
      'Working directory changed to',
      chalk.magenta(tildify(env.cwd))
    );
  }

  env.config = require(env.configPath);
  env.name = env.config.name;
  env.app = new am.App(env.configBase);

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