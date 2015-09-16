'use strict';

/**
 * Module for accessing the kalabox install framework.
 * @module kbox.install
 */

// Native modules
var path = require('path');
var fs = require('fs');

// NPM modules
var chalk = require('chalk');
var _ = require('lodash');

// Kalabox modules
var core = require('./core.js');

// Exports
var framework = exports.framework = require('./install/framework.js');
var installFramework = framework();
var events = exports.events = installFramework.events;
var linuxOsInfo = require('./install/linuxOsInfo.js');
exports.linuxOsInfo = linuxOsInfo;
var cmd = require('./install/cmd.js');
exports.cmd = cmd;

exports.run = function(opts, callback) {

  // Handle the situation where we aren't passing in opts
  // therefore the opts are actually the callback
  if (!callback && typeof opts === 'function') {
    callback = opts;
  }

  // Get the installer function
  var installFunction = installFramework.getInstall(process.platform);

  // Is the current mode cli?
  var isCli = core.deps.get('mode') === 'cli';

  // Put this
  // Get the current time in milliseconds.
  var getTime = function() {
    return Date.now();
  };

  // get the global config
  var config = core.deps.lookup('config');

  // Logging function.
  var log = core.log;

  /*
   * Helper function to use for when a step fails
   */
  var fail = function(state, msg) {
    state.log.info(chalk.red(msg));
    state.status = false;
  };

  /*
   * Return some info about the current state of the kalabox installation
   */
  var updateCurrentInstall = function(installDetails) {

    // This is where our current install file should live
    var cIF = path.join(config.sysConfRoot, 'installed.json');

    // If the file exists use that if not empty object
    var currentInstall = (fs.existsSync(cIF)) ? require(cIF) : {};

    // Set the install details as the defaults and then add in what we
    // already have
    var newInstall = _.merge(currentInstall, installDetails);

    // Update the CIF
    fs.writeFileSync(cIF, JSON.stringify(newInstall, null, 2));

  };

  // State to inject into install.
  var state = {
    disksize: false,
    password: !isCli,
    nonInteractive: !isCli,
    adminCommands: [],
    config: config,
    downloads: [],
    images: [],
    log: log,
    status: true,
    stepIndex: 1,
    fail: fail,
    updateCurrentInstall: updateCurrentInstall
  };

  // Override any defaults we may have set
  if (opts && typeof opts === 'object') {
    state = _.defaults(opts, state);
  }

  // Time the install started.
  var startTime = getTime();

  // Time the current step started.
  var stepStartTime = startTime;

  if (isCli) {
    // Runs right before step.
    installFramework.events.on('pre-step', function(ctx) {
      // Logging stuff
      var totalSteps = ctx.state.stepCount;
      var stepNumberInfo = [ctx.state.stepIndex, totalSteps].join(':');
      var stepInfo = 'Starting ' + ctx.step.name;
      log.debug('[' + stepNumberInfo + '] ' + stepInfo);
      log.debug('description => ' + ctx.step.description);
      log.debug('dependencies => ' + ctx.step.deps.join(', '));
      log.info(chalk.cyan('-- Step ' +
        ctx.state.stepIndex + '/' + totalSteps + ' --'));
      log.info(chalk.grey(ctx.step.description));
      ctx.state.stepIndex += 1;
    });
  }

  if (isCli) {
    // Runs right after step.
    installFramework.events.on('post-step', function(ctx) {
      var now = getTime();
      var duration = now - stepStartTime;
      stepStartTime = now;
      if (ctx.state.status) {
        log.debug('Finished ' + ctx.step.name + ' (' + duration + ')');
        var progress = Math.round(
          ((ctx.state.stepIndex - 1) / ctx.state.stepCount) * 100);
        var msg =
          chalk.cyan('-- ') + chalk.green('OK! ' + progress + '% complete!') +
           chalk.cyan(' --');
        log.info(msg);
      }
      else {
        log.info(
          chalk.cyan('-- ') + chalk.red('INSTALL FAILURE.') + chalk.cyan(' --')
        );
        process.exit(1);
      }
      console.log('');
    });
  }

  if (isCli) {
    // Error.
    installFramework.events.on('error', function(err) {
      console.log(err);
    });
  }

  if (isCli) {
    // Install is done.
    // @todo: we need to get the GUI to set these things to
    installFramework.events.on('end', function(ctx) {
      if (ctx.state.status) {

        // Write the provisioned file
        var proFile = path.join(ctx.state.config.sysConfRoot, 'provisioned');
        fs.writeFileSync(proFile, 'true');

        // Update our current install file
        var kVersion = ctx.state.config.version;
        ctx.state.updateCurrentInstall({KALABOX_VERSION: kVersion});

        // Celebrate great success
        log.info(chalk.green('Huzzah! Victory!'));
      }
    });
  }

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
