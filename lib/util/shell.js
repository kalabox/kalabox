/**
 * Module to loosely coupled shell execution.
 * @name shell
 */

'use strict';

// Node modules
var spawn = require('child_process').spawn;
var path = require('path');

// npm modules
var _ = require('lodash');
var _shell = require('shelljs');
var esc = require('shell-escape');
var VError = require('verror');

// Kalabox modules
var core = require('../core.js');
var Promise = require('../promise.js');

/**
 * Get an env object to inject into child process.
 */
function getEnvironment(opts) {
  if (opts.app) {
    // Merge app env over the process env and return.
    var processEnv = _.cloneDeep(process.env);
    var appEnv = opts.app.env.getEnv();
    return _.merge(processEnv, appEnv);
  } else {
    // Just use process env.
    return process.env;
  }
}

/*
 * Troll stdout for app status messages.
 */
function trollStdout(opts, msg) {
  var app = _.get(opts, 'app');
  if (app && msg) {
    app.trollForStatus(msg);
  }
}

/**
 * Executes a shell command.
 * @memberof shell
 * @arg {string|Array} cmd - The shell command to run or an array of commands.
 * @arg {Object} opts - Options
 * @example
 * return kbox.util.shell.exec(cmd, opts)
 * .then(function(output) {
 *   // things
 * });
 */
exports.exec = function(cmd, opts) {

  // Merge in our options
  var defaults = {silent: true};
  var options = (opts) ? _.extend(defaults, opts) : defaults;

  // Set environment for spawned process.
  options.env = getEnvironment(options);

  // Logging functions.
  var execLog = core.log.make('UTIL EXEC');
  execLog.debug([cmd, opts]);

  // Promisify the exec
  return new Promise(function(resolve, reject) {
    _shell.exec(esc(cmd), options, function(code, stdout, stderr) {
      if (code !== 0) {
        reject(new VError('code: ' + code + 'err:' + stderr));
      }
      else {
        resolve(stdout);
      }
    });
  });

};

/**
 * Spawns a shell command. And optionally collects things
 * @arg {Array} cmd - An array of commands. Split by spaces.
 * @arg {Object} opts - Options on what to do
 * @example
 * return kbox.util.shell.execAdminAsync(cmd, opts)
 * .then(function(output) {
 *   // things
 * });
 */
exports.spawn = function(cmd, opts) {

  // Promisify the spawn
  return new Promise(function(resolve, reject) {

    // Merge provided options with defaults
    var defaults = {stdio: ['pipe', 'pipe', 'pipe']};
    var options = (opts) ? _.extend(defaults, opts) : defaults;

    // Set environment for spawned process.
    options.env = getEnvironment(opts);

    // Use stdio options and then create the child
    var entrypoint = cmd.shift();

    // Run the spawn
    var run = spawn(entrypoint, cmd, options);

    // Set of logging functions.
    var spawnLog = core.log.make(path.basename(entrypoint).toUpperCase());
    spawnLog.debug([entrypoint, cmd, options]);

    // Collector for buffer
    var stdOut = '';
    var stdErr = '';

    // Collect data if stdout is being piped
    if (options.stdio === 'pipe' || options.stdio[1] === 'pipe') {
      run.stdout.on('data', function(buffer) {
        spawnLog.info(_.trim(String(buffer)));
        stdOut = stdOut + String(buffer);
        trollStdout(options, _.trim(String(buffer)));
      });
    }

    // Reject if we get an error
    run.on('error', function(buffer) {
      spawnLog.info(_.trim(String(buffer)));
      stdErr = stdErr + String(buffer);
    });

    // Callback when done
    run.on('close', function(code) {
      spawnLog.info('Run exited with code: ' + code);
      if (code !== 0) {
        reject(new VError('code' + code + 'err:' + stdErr + 'more:' + stdOut));
      }
      else {
        resolve(stdOut);
      }
    });

  });
};

/**
 * Escapes the spaces in an array or string into a string to make it more CLI friendly
 * @arg {string|Array} command - The command to run.
 */
exports.escSpaces = function(s, platform) {

  var p = platform || process.platform;

  if (_.isArray(s)) {
    s = s.join(' ');
  }
  if (p === 'win32') {
    return s.replace(/ /g, '^ ');
  }
  else {
    return s.replace(/ /g, '\ ');
  }
};

/**
 * Escapes an array or string into a string to make it more CLI friendly
 * @arg {string|Array} command - The command to run.
 */
exports.esc = esc;

/**
 * Do a which
 */
exports.which = _shell.which;
