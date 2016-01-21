/**
 * Contains environment handling suff
 * @module machine.env
 */

'use strict';

module.exports = function(kbox) {

  // Native
  var path = require('path');

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

      // Add the correct gitbin
      // This can be in different spots for different windows versions so
      // we add the ones that exist
      var home = kbox.core.deps.get('globalConfig').home;
      var gBin1 = 'C:\\Program Files (x86)\\Git\\bin';
      var gBin2 = path.join(home, 'AppData', 'Local', 'Programs', 'Git', 'bin');

      // Only add the gitbin to the path if the path doesn't start with
      // it. We want to make sure gitBin is first so other things like
      // putty don't F with it.
      // See https://github.com/kalabox/kalabox/issues/342
      _.forEach([gBin1, gBin2], function(gitBin) {
        if (fs.existsSync(gitBin) && !_.startsWith(process.env.path, gitBin)) {
          kbox.core.env.setEnv('Path', [gitBin, process.env.Path].join(';'));
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

  };

  // Build module function.
  return {
    setDockerEnv: setDockerEnv
  };

};
