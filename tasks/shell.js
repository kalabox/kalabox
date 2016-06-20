'use strict';

/**
 * This file/module contains all our shell based Grunt tasks
 */

module.exports = function(common) {

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
   * Constructs the CLI PKG task
   */
  var cliPkgTask = function(dev) {

    // Grab JXCore bin
    var jxBin = require('jxcore').findpath();

    // "Constants"
    var platform = common.system.platform;
    var cpCmd = (platform === 'win32') ? 'copy' : 'cp';
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

    // NPM install command
    var npmCmd = ['npm', 'install', '--production'].join(' ');

    // Start to build the command
    var cmd = [];
    cmd.push(npmCmd);
    cmd.push(jxCmd);

    // Add a version lock command if we are in production mode
    if (!dev) {
      var lockCmd = [cpCmd, 'package.json', 'version.lock'].join(' ');
      cmd.push(lockCmd);
    }

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
    scriptTask: scriptTask,
    psTask: psTask
  };

};
