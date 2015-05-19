/**
 * Module to loosely coupled shell execution.
 * @module kbox.util.shell
 */

'use strict';

var _shell = require('shelljs');
var mode = require('../core/mode.js');

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

  var autoPass = function(cmd, password) {
    var scmd = '';
    return 'echo \'' + password + '\' | sudo -S sh -c \'' + cmd + '\'';
  };

  if (process.platform === 'darwin') {
    if (mode.get() !== 'cli') {
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
    if (mode.get() !== 'cli') {
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
