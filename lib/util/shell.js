/**
 * Module to loosely coupled shell execution.
 * @module shell
 */

'use strict';

var _shell = require('shelljs');
var exec = require('child_process').exec;

exports.execAsync = function(cmd) {
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
exports.exec = function(cmd, callback) {
  // @todo: unjank this wrapper
  var opts = {};
  if (process.platform === 'win32') {
    // @todo: this assumes you've installed mysys git
    opts = {
      silent: true,
      shell: '"C:\\Program Files (x86)\\Git\\bin\\sh.exe"'
    };
    exec(cmd, opts, function(error, stdout, stderr) {
      if (error) {
        callback(error, stdout);
      }
      else {
        callback(null, stdout);
      }
    });
  }
  else {
    opts = {silent: true};
    _shell.exec(cmd, opts, function(code, output) {
      var err = null;
      if (code !== 0) {
        err = new Error(
          'code: ' + code + ', msg: ' + output.substring(0, 1024)
        );
      }
      callback(err, output);
    });
  }
};

exports.execAdminAsync = function(cmd) {
  var appleScript =
    'do shell script "' + cmd + '" with administrator privileges';
  var shellScript = 'osascript -e \'' + appleScript + '\'';
  return this.execAsync(shellScript);
};

exports.execAdmin = function(cmd, callback) {
  var appleScript =
    'do shell script "' + cmd + '" with administrator privileges';
  var shellScript = 'osascript -e \'' + appleScript + '\'';
  this.exec(shellScript, callback);
};

exports.psAll = function(callback) {
  var cmd = 'ps -A';
  this.exec(cmd, callback);
};
