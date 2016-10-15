/**
 * Contains environment handling suff
 * @module machine.env
 */

'use strict';

module.exports = function(kbox) {

  // Native
  var path = require('path');
  var url = require('url');

  // NPM modules
  var _ = require('lodash');
  var fs = require('fs-extra');

  // Kalabox modules
  var bin = require('./bin.js')(kbox);

  /*
   * Set Provider Env
   */
  var setDockerEnv = function() {

    // Set Path environmental variable if we are on windows so we get access
    // to things like ssh.exe
    if (process.platform === 'win32') {

      var appData = process.env.LOCALAPPDATA;
      var programFiles = process.env.ProgramFiles;
      var programFiles2 = process.env.ProgramW6432;
      var gitBin1 = path.join(appData, 'Programs', 'Git', 'usr', 'bin');
      var gitBin2 = path.join(programFiles, 'Git', 'usr', 'bin');
      var gitBin3 = path.join(programFiles2, 'Git', 'usr', 'bin');

      // Only add the gitbin to the path if the path doesn't start with
      // it. We want to make sure gitBin is first so other things like
      // putty don't F with it.
      // See https://github.com/kalabox/kalabox/issues/342
      _.forEach([gitBin1, gitBin2, gitBin3], function(gBin) {
        if (fs.existsSync(gBin) && !_.startsWith(process.env.path, gBin)) {
          kbox.core.env.setEnv('Path', [gBin, process.env.Path].join(';'));
        }
      });

    }

    // Add docker executables path to path to handle weird situations where
    // the user may not have machine in their path
    var pathString = (process.platform === 'win32') ? 'Path' : 'PATH';
    var dockerPath = bin.getBinPath();
    if (!_.startsWith(process.env[pathString], dockerPath)) {
      var newPath = [dockerPath, process.env[pathString]].join(path.delimiter);
      kbox.core.env.setEnv(pathString, newPath);
    }

    // Get our config so we can set our env correctly
    var engineConfig = kbox.core.deps.get('engineConfig');

    // Parse the docker host url
    var dockerHost = url.format({
      protocol: 'tcp',
      slashes: true,
      hostname: engineConfig.host,
      port: engineConfig.port
    });

    // Set our docker host for compose
    if (process.platform === 'linux') {
      kbox.core.env.setEnv('DOCKER_HOST', dockerHost);
    }

    // Verify all DOCKER_* vars are stripped on darwin and windows
    if (process.platform === 'darwin' || process.platform === 'win32') {
      _.each(process.env, function(value, key) {
        if (_.includes(key, 'DOCKER_')) {
          delete process.env[key];
        }
      });
    }

  };

  // Build module function.
  return {
    setDockerEnv: setDockerEnv
  };

};
