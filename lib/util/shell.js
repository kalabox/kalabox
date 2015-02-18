/**
 * Module to loosely coupled shell execution.
 * @module shell
 */

'use strict';

var _shell = require('shelljs');

exports.execAsync = function(cmd) {
  return _shell.exec(cmd, {async:true, silent:true});
};

var getAdminWrapper = function(cmd) {
  if (process.platform === 'darwin') {
    var appleScript =
      'do shell script "' + cmd + '" with administrator privileges';
    return 'osascript -e \'' + appleScript + '\'';
  }
  else if (process.platform === 'win32') {
    return cmd;
  }
  else {
    // @todo need to get this to be GUI
    return 'sudo sh -c \'' + cmd + '\'';
  }
};

/**
 * Executes a shell command.
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

exports.execAdminAsync = function(cmd) {
  return this.execAsync(getAdminWrapper(cmd));
};

exports.execAdmin = function(cmd, callback) {
  this.exec(getAdminWrapper(cmd), callback);
};

exports.psAll = function(callback) {
  var cmd = 'ps -A';
  this.exec(cmd, callback);
};
