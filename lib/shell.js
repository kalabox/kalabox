/**
 * Module to loosely coupled shell execution.
 * @module shell
 */

'use strict';

var _shell = require('shelljs');

module.exports.execAsync = function (cmd) {
  return _shell.exec(cmd, {async:true, silent:true});
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
module.exports.exec = function(cmd, callback) {
  var opts = {silent: true};
  _shell.exec(cmd, opts, function(code, output) {
    var err = null;
    if (code !== 0) {
      err = new Error('code: ' + code + ', msg: ' + output.substring(0, 1024));
    }
    callback(err, output);
  });
};

module.exports.execAdminAsync = function (cmd) {
  var appleScript = 'do shell script "' + cmd + '" with administrator privileges';
  var shellScript = 'osascript -e \'' + appleScript + '\'';
  return this.execAsync(shellScript);
};

module.exports.execAdmin = function (cmd, callback) {
  var appleScript = 'do shell script "' + cmd + '" with administrator privileges';
  var shellScript = 'osascript -e \'' + appleScript + '\'';
  this.exec(shellScript, callback);
};

module.exports.psAll = function (callback) {
  var cmd = 'ps -A';
  this.exec(cmd, callback);
};


