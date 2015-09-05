'use strict';

/**
 * Module for accessing the kalabox install framework.
 * @module kbox.install
 */

var cmd = require('./install/cmd.js');
var core = require('./core.js');
var chalk = require('chalk');
exports.cmd = cmd;

var framework = exports.framework = require('./install/framework.js');

var installFramework = framework();

var linuxOsInfo = require('./install/linuxOsInfo.js');
exports.linuxOsInfo = linuxOsInfo;

exports.run = function(callback) {

  var installFunction = installFramework.getInstall(process.platform);

  // Put this
  // Get the current time in milliseconds.
  var getTime = function() {
    return Date.now();
  };

  var config = core.deps.lookup('config');

  // Logging function.
  var log = core.log;

  // State to inject into install.
  var state = {
    disksize: false,
    password: false,
    nonInteractive: false,
    adminCommands: [],
    config: config,
    downloads: [],
    containers: [],
    log: log,
    status: true
  };

  // Keep track of which step we are on.
  var stepIndex = 1;

  // Time the install started.
  var startTime = getTime();

  // Time the current step started.
  var stepStartTime = startTime;

  // Runs right before step.
  installFramework.events.on('pre-step', function(step) {
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
  installFramework.events.on('post-step', function(step) {
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
  installFramework.events.on('error', function(err) {
    console.log(err);
  });

  // Install is done.
  installFramework.events.on('end', function(state) {
    log.info(chalk.green('Huzzah! Victory!'));
  });

  return installFunction(state)

  .nodeify(callback);

};

exports.getSteps = function() {
  return installFramework.getSteps(process.platform);
};

exports.events = installFramework.events;

exports.stepCount = installFramework.count;

/**
 * Register an install step with the kalabox install framework.
 * @static
 * @method
 * @arg {function} handler - Function used to build a new install step.
 * @arg {object} handler.step - Unitialized step object.
 * @arg {function} handler.done [optional] - Callback function to return async
 *   control back to kalabox.
 * @example
 * kbox.install.registerStep(function(step) {
 *   step.name = 'install-my-custom-plugin';
 *   step.description = 'Install my custom plugin that kicks butt!';
 *
 *   // List of the names of other steps this step requires to be run first.
 *   step.deps = ['internet'];
 *
 *   // List of the names of other steps that should be run after
 *   //   this one.
 *   step.subscribes = ['use-my-custom-plugin'];
 *
 *   // You can define one function for all operating systems.
 *   step.all = function(state, done) {
 *     state.log('starting to install my custom plugin.');
 *     myCustomPlug.install(function(err) {
 *       if (err) {
 *         return done(err);
 *       }
 *       state.log('done installing my custom plugin.');
 *       done();
 *     });
 *   };
 *
 *   // Or you can define different functions for different operation systems.
 *
 *   // Run this install function only for darwin (Mac OS X).
 *   step.all.darwin = function(state, done) {
 *     // Do darwin specific stuffs.
 *     done();
 *   };
 *
 *   // Run this install function only for fedora.
 *   step.all.linux.fedora = function(state, done) {
 *     // Do fedora specific stuffs.
 *     done();
 *   };
 *
 *   // Here are all possible choices.
 *   step.all: {
 *     darwin: function
 *     linux: {
 *       debain: function,
 *       fedora: function,
 *       other: function
 *     },
 *     win32: function
 *   };
 *
 * });
 */
exports.registerStep = installFramework.registerStep;
