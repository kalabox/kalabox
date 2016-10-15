/**
 * Contains binary handling suff
 * @module machine.bin
 */

'use strict';

module.exports = function(kbox) {

  // Node modules
  var path = require('path');

  // NPM modules
  var _ = require('lodash');

  // Kalabox modules
  var shell = kbox.util.shell;

  /*
   * Get directory for docker bin base.
   */
  var getBinPath = function() {
    switch (process.platform) {
      case 'darwin':
        return path.join('/Applications/Docker.app/Contents/Resources', 'bin');
      case 'linux':
        return path.join(kbox.core.deps.get('config').sysConfRoot, 'bin');
      case 'win32':
        var programFiles = process.env.ProgramW6432;
        return path.join(programFiles + '\\Docker\\Docker\\resources\\bin');
    }
  };

  /*
   * Return the machine executable location
   */
  var getComposeExecutable = function() {

    // Get compose bin path
    var composePath = getBinPath();
    var composeBin = path.join(composePath, 'docker-compose');

    // Return exec based on path
    switch (process.platform) {
      case 'darwin': return composeBin;
      case 'linux': return composeBin;
      case 'win32': return composeBin + '.exe';
    }

  };

  /*
   * This should only be needed for linux
   */
  var getDockerExecutable = function() {

    // Get docker bin path
    var dockerPath = getBinPath();
    var dockerBin = path.join(dockerPath, 'docker');

    // Return exec based on path
    switch (process.platform) {
      case 'darwin': return dockerBin;
      case 'linux': return dockerBin;
      case 'win32': return dockerBin + '.exe';
    }

  };

  /*
   * Exec or spawn a shell command.
   */
  var sh = function(cmd, opts) {

    // If we have a mode or are detached then we need to spawn
    if (opts && (opts.mode || opts.detached === true)) {

      /*
       * Compose run's require stdin to be a tty to get the correct output back
       * so we have to set stdin on collect to pty so it get's replaced with a
       * pseudo terminal's stdin.
       */

      // Stdio per mode
      var mode = kbox.core.deps.get('mode');
      var stdinMode = (mode === 'gui') ? 'ignore' : process.stdin;
      var stdErrMode = (mode === 'gui') ? 'ignore' : process.stderr;

      // Attach and collect modes
      var collect = {stdio: [stdinMode, 'pipe', stdErrMode]};
      var attach = {stdio: 'inherit'};
      var stdio = (opts.mode === 'attach') ? attach : collect;

      // Merge in our options
      var options = (opts) ? _.extend(opts, stdio) : stdio;

      return shell.spawn(cmd, options);
    }

    // Otherwise we can do a basic exec
    else {
      return shell.exec(cmd, opts);
    }
  };

  // Build module function.
  return {
    sh: sh,
    getBinPath: getBinPath,
    getDockerExecutable: getDockerExecutable,
    getComposeExecutable: getComposeExecutable
  };

};
