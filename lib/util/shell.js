/**
 * Module to loosely coupled shell execution.
 * @module kbox.util.shell
 */

'use strict';

// Node modules
var spawn = require('child_process').spawn;
var path = require('path');

// npm modules
var _ = require('lodash');
var _shell = require('shelljs');
var windows = require('node-windows');
var esc = require('shell-escape');
var VError = require('verror');

// Kalabox modules
var core = require('../core.js');
var Promise = require('../promise.js');

/*
 * Helper method to get a GUI admin wrapper
 */
var getGuiAdminWrapper = function(cmdString) {

  /*
   * Helper for applescript wrapper
   */
  var asWrap = function(cmdString) {
    return 'do shell script "' + cmdString + '" with administrator privileges';
  };

  // Return path based on platform
  switch (process.platform) {
    case 'win32': return cmdString;
    //@todo: Does this work on fedora?
    case 'linux': return [
        'pkexec',
        '--user',
        'root',
        'sudo',
        'sh',
        '-c',
        cmdString
      ];
    case 'darwin': return [
        'osascript',
        '-e',
        asWrap(cmdString)
      ];
  }

};

/*
 * Helper method to get a CLI admin wrapper
 */
var getCliAdminWrapper = function(cmdString, opts) {

  // Cli wrapper for POSIX
  if (process.platform !== 'win32') {

    /*
     * Helper to run sudo with a password if that
     * password is provided as options.password
     */
    if (opts && opts.password) {
      return esc([
        'echo',
        opts.password,
        '|',
        'sudo',
        '-S',
        'sh',
        '-c',
        cmdString
      ]);
    }

    // Else just normal sudo
    return esc(['sudo', 'sh', '-c', cmdString]);

  }

  // Otherwise return the command as is
  return cmdString;

};

/*
 * Helper to wrap a command with needed things to run as an admin
 */
var getAdminWrapper = function(cmds, options) {

  // Join cmds if needed
  if (_.isArray(cmds)) {
    cmds = cmds.join(' && ');
  }

  // Return the delegated wrapper based on the mode
  switch (core.deps.get('mode')) {
    case 'cli': return getCliAdminWrapper(cmds, options);
    case 'gui': return getGuiAdminWrapper(cmds);
  }

};

/**
 * Executes a shell command.
 * @arg {string|array} cmd - The shell command to run or an array of commands.
 * @arg {object} opts - Options
 * @example
 * return kbox.util.shell.exec(cmd, opts)
 * .then(function(output) {
 *   // things
 * });
 */
var exec = exports.exec = function(cmd, opts) {

  // Merge in our options
  var defaults = {silent: true};
  var options = (opts) ? _.extend(defaults, opts) : defaults;

  // Logging functions.
  var execLog = core.log.make('RUNNING COMMAND');
  execLog.debug(cmd, opts);

  // Promisify the exec
  return new Promise(function(resolve, reject) {
    _shell.exec(esc(cmd), options, function(code, output) {
      if (code !== 0) {
        reject(new VError('code: ' + code + 'msg:' + output));
      }
      else {
        resolve(output);
      }
    });
  });

};

/**
 * Executes a shell command.
 * @arg {string} cmd - The shell command to run.
 * @example
 * var child = kbox.util.shell.execAsync(cmd);
 * child.stdout.on('data', function(data) {
 *   console.log(data);
 * });
 * child.stdout.on('end', function() {
 *   callback();
 * });
 */
var execAsync = exports.execAsync = function(cmd) {

  // Promisify exec
  return new Promise(function(resolve, reject) {

    // Logging functions.
    var execLog = core.log.make('ADMIN COMMAND');
    execLog.debug(cmd);

    // Use stdio options and then create the child
    var child = _shell.exec(cmd, {async:true, silent:true});

    // Collector for buffer
    var stdOut = '';
    var stdErr = '';

    // Log our stuff
    child.stdout.on('data', function(buffer) {
      execLog.info(_.trim(String(buffer)));
      stdOut = stdOut + String(buffer);
    });

    // Reject if we get an error
    child.stderr.on('data', function(buffer) {
      execLog.debug(_.trim(String(buffer)));
      stdErr = stdErr + String(buffer);
    });

    // Callback when done
    child.on('close', function(code) {
      if (code !== 0) {
        reject(new VError(stdErr));
      }
      else {
        resolve(stdOut);
      }
    });

  });

};

/**
 * Spawns a shell command. And optionally collects things
 * @arg {array} cmd - An array of commands. Split by spaces.
 * @arg {object} opts - Options on what to do
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

    // Use stdio options and then create the child
    var entrypoint = cmd.shift();
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
      });
    }

    // Reject if we get an error
    run.on('error', function(buffer) {
      spawnLog.info(_.trim(String(buffer)));
      stdErr = stdErr + String(buffer);
    });

    // Callback when done
    run.on('close', function(code) {
      if (code !== 0) {
        reject(new VError(stdErr));
      }
      else {
        resolve(stdOut);
      }
    });

  });
};

/**
 * Asynchroniously Executes command(s) that requires admin permissions
 * @arg {string|array} commands - The shell command or an array of commands to run.
 * @arg {object} opts - Options to pass in
 * @example
 * var child = kbox.util.shell.execAdminAsync(cmds, opts);
 * child.stdout.on('data', function(data) {
 *   console.log(data);
 * });
 * child.stdout.on('end', function() {
 *   callback();
 * });
 */
exports.execAdminAsync = function(cmds, opts) {
  return execAsync(getAdminWrapper(cmds, opts));
};

/**
 * Executes commands that requires admin permissions
 * @arg {string|array} commands - The shell command or an array of commands to run.
 * @arg {object} opts - Options to pass in
 * @example
 * return kbox.util.shell.execAdmin(cmd)
 * .then(function(data){
 *   if (data === 'whatimlookingfor') {
 *     return true;
 *   }
 * });
 */
exports.execAdmin = function(cmds, opts) {
  return exec(getAdminWrapper(cmds), opts);
};

/**
 * Executes an elevated command on windows
 * @arg {string} command - The command to run.
 * @example
 * var cmd = 'netsh interface ipv4 set address name="' + adapter + '" ' +
        'static ' + ip + ' store=persistent';
 * return kbox.util.shell.execElevated(cmd)
 * .then(function(data) {
 *   return data;
 * });
 */
exports.execElevated = function(cmd) {
  return Promise.fromNode(function(callback) {
    var elevateLog = core.log.make('WIN ELEVATED');
    elevateLog.info(cmd);
    windows.elevate(cmd, {}, callback);
  });
};

/**
 * Escapes the spaces in an array or string into a string to make it more CLI friendly
 * @arg {string|array} command - The command to run.
 */
exports.escSpaces = function(s) {
  if (_.isArray(s)) {
    s = s.join(' ');
  }
  if (process.platform === 'win32') {
    return s.replace(/ /g, '^ ');
  }
  else {
    return s.replace(/ /g, '\ ');
  }
};

/**
 * Escapes an array or string into a string to make it more CLI friendly
 * @arg {string|array} command - The command to run.
 */
exports.esc = esc;
