/**
 * Module to loosely coupled shell execution.
 * @module kbox.util.shell
 */

'use strict';

// npm modules
var _ = require('lodash');
var _shell = require('shelljs');
var windows = require('node-windows');

// Kalabox modules
var core = require('../core.js');
var Promise = require('../promise.js');

/**
 * Executes a shell command.
 * @arg {string} cmd - The shell command to run.
 * @example
 * var shell = require(...);
 * var cmd = 'which kbox';
 * shell.exec(cmd, function(err, output) {
 *   if (err) {
 *     throw err;
 *   } else {
 *     console.log(output);
 *   }
 * });
 */
exports.execAsync = function(cmd) {
  return _shell.exec(cmd, {async:true, silent:true});
};

var getAdminWrapper = function(cmd, options) {

  var mode = core.deps.get('mode');

  var autoPass = function(cmd, password) {
    var scmd = '';
    return 'echo \'' + password + '\' | sudo -S sh -c \'' + cmd + '\'';
  };

  if (process.platform === 'darwin') {
    if (mode !== 'cli') {
      var appleScript =
        'do shell script "' + cmd + '" with administrator privileges';
      return 'osascript -e \'' + appleScript + '\'';
    }
    else {
      if (options.password !== false) {
        return autoPass(cmd, options.password);
      }
      else {
        return 'sudo sh -c \'' + cmd + '\'';
      }
    }
  }

  else if (process.platform === 'win32') {
    return cmd;
  }

  else {
    // @todo: fedora?
    if (mode !== 'cli') {
      return 'pkexec --user root sudo sh -c \'' + cmd + '\'';
    }
    else {
      if (options.password !== false) {
        return autoPass(cmd, options.password);
      }
      else {
        return 'sudo sh -c \'' + cmd + '\'';
      }
    }
  }
};

/**
 * Executes a shell command.
 * @arg {string} cmd - The shell command to run.
 * @arg {function} callback - Callback function that is called on completion.
 * @example
 * var shell = require(...);
 * var cmd = 'which kbox';
 * shell.exec(cmd, function(err, output) {
 *   if (err) {
 *     throw err;
 *   } else {
 *     console.log(output);
 *   }
 * });
 */
exports.exec = function(cmd, callback) {

  if (_.isArray(cmd)) {
    cmd = cmd.join(' ');
  }

  var opts = {silent: true};
  _shell.exec(cmd, opts, function(code, output) {
    var err = null;
    if (code !== 0) {
      err = new Error(
        'code: ' + code + ', msg: ' + output.substring(0, 1024)
      );
    }
    callback(err, output);
  });
};

/**
 * Executes a command that requires admin permissions
 * @arg {string} command - The shell command to run.
 * @example
 * var shell = require(...);
 * var cmd = 'which kbox';
 * shell.exec(cmd, function(err, output) {
 *   if (err) {
 *     throw err;
 *   } else {
 *     console.log(output);
 *   }
 * });
 */
exports.execAdminAsync = function(cmd, options) {
  return this.execAsync(getAdminWrapper(cmd, options));
};

/**
 * Executes a command that requires admin permissions
 * @arg {string} command - The shell command to run.
 * @arg {function} callback - Callback function that is called on completion.
 * @example
 * var shell = require(...);
 * var cmd = 'which kbox';
 * shell.exec(cmd, function(err, output) {
 *   if (err) {
 *     throw err;
 *   } else {
 *     console.log(output);
 *   }
 * });
 */
exports.execAdmin = function(cmd, callback) {
  this.exec(getAdminWrapper(cmd), callback);
};

/**
 * Executes an elevated command on windows
 * @arg {string} command - The command to run.
 * @example
 * var cmd = 'netsh interface ipv4 set address name="' + adapter + '" ' +
        'static ' + ip + ' store=persistent';
 * return kbox.util.shell.execElevated(cmd)
 * .then(function(data) {
 *   console.log(data);
 * })
 */
exports.execElevated = function(cmd) {
  return Promise.fromNode(function(callback) {
    windows.elevate(cmd, {}, callback);
  });
};
