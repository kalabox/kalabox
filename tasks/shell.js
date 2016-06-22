'use strict';

/**
 * This file/module contains all our shell based Grunt tasks
 */

// Find the NW path

module.exports = function(common) {

  // Get the platform
  var platform = common.system.platform;

  /*
   * Helper function to do the correct npm install
   */
  var npmInstallCmd = function(dev) {

    // Start a command collector
    var cmd = [];

    // Normal CMDz
    cmd.push('npm install --production');

    // Add a version lock command if we are in production mode
    if (!dev) {
      var cpCmd = (platform === 'win32') ? 'copy' : 'cp';
      var lockCmd = [cpCmd, 'package.json', 'version.lock'].join(' ');
      cmd.push(lockCmd);
    }

    // Return the command as a string
    return cmd.join(' && ');

  };

  /*
   * Run a default bash/sh/cmd script
   */
  var scriptTask = function(cmd) {

    // "Constants"
    var shellOpts = {execOptions: {maxBuffer: 20 * 1024 * 1024}};

    // Return our shell task
    return {
      options: shellOpts,
      command: cmd
    };

  };

  /*
   * Run a ps script
   */
  var psTask = function(cmd) {

    // "Constants"
    var shellOpts = {execOptions: {maxBuffer: 20 * 1024 * 1024}};
    var entrypoint = 'PowerShell -NoProfile -ExecutionPolicy Bypass -Command';

    // Return our ps task
    return {
      options: shellOpts,
      command: [entrypoint, cmd, '&& EXIT /B %errorlevel%'].join(' ')
    };

  };

  /*
   * Returns a BATS task
   */
  var batsTask = function(files) {

    // "Constants"
    var shellOpts = {execOptions: {maxBuffer: 20 * 1024 * 1024}};

    // BATS binary
    var bin = 'node_modules/bats/libexec/bats';
    var opts = '${CI:+--tap}';
    var cmd = [bin, opts, files.join(' ')];

    // Return our BATS task
    return {
      options: shellOpts,
      command: cmd.join(' '),
    };

  };

  /*
   * Helper function to do the correct npm install
   */
  var guiInstallTask = function(dev) {

    // "Constants"
    var shellOpts = {
      execOptions: {
        cwd: 'build/gui',
        maxBuffer: 20 * 1024 * 1024
      }
    };

    // Return the CLI build task
    return {
      options: shellOpts,
      command: npmInstallCmd(dev)
    };

  };

  /*
   * Constructs the CLI PKG task
   */
  var cliPkgTask = function(dev) {

    // Grab JXCore bin
    var jxBin = require('jxcore').findpath();

    // "Constants"
    var pkgName = 'kbox-' + common.kalabox.pkgType;
    var shellOpts = {
      execOptions: {
        cwd: 'build/cli',
        maxBuffer: 20 * 1024 * 1024
      }
    };

    // Include patterns
    var jxAddPatterns = common.files.jxAdd;

    // Exclude patterns
    var jxSlimPatterns = common.files.jxSlim;

    // JX package command
    var jxCmd = [
      jxBin,
      'package',
      'bin/kbox.js',
      pkgName,
      '--add "' + jxAddPatterns.join(',') + '"',
      '--slim "' + jxSlimPatterns.join(',') + '"',
      '--native'
    ].join(' ');

    // Start to build the command
    var cmd = [];
    cmd.push(npmInstallCmd(dev));
    cmd.push(jxCmd);

    // Add executable perms on POSIX
    if (platform !== 'win32') {
      cmd.push('chmod +x ' + pkgName);
      cmd.push('sleep 2');
    }

    // Return the CLI build task
    return {
      options: shellOpts,
      command: cmd.join(' && ')
    };

  };

  // Return our things
  return {
    batsTask: batsTask,
    cliPkgTask: cliPkgTask,
    guiInstallTask: guiInstallTask,
    psTask: psTask,
    scriptTask: scriptTask
  };

};
