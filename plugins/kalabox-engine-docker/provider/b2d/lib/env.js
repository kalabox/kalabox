/**
 * Contains environment handling suff
 * @module b2d.env
 */

'use strict';

module.exports = function(kbox) {

  // Node modules
  var path = require('path');

  // NPM modules
  var VError = require('verror');
  var fs = require('fs-extra');
  var _ = require('lodash');

  // Kalabox modules
  var Promise = kbox.Promise;
  var bin = require('./bin.js')(kbox);

  /*
   * Get root directory for provider.
   */
  var getRootDir = function() {
    return kbox.core.deps.get('config').sysProviderRoot;
  };

  /*
   * Get path to provider profile.
   */
  var getProfilePath = function() {
    return path.join(getRootDir(), 'profile');
  };

  /*
   * Set provider profile as environmental variable.
   */
  var setRootDirEnv = function() {
    kbox.core.env.setEnv('BOOT2DOCKER_DIR', getRootDir());
  };

    /*
   * Return true if boot2docker profile exists and is in the right place.
   */
  var hasProfile = function() {

    // Get path to profile.
    var profilePath = getProfilePath();

    // Read contents of profile.
    return Promise.fromNode(function(cb) {
      fs.readFile(profilePath, {encoding: 'utf8'}, cb);
    })
    // Read was successful so return true.
    .then(function() {
      return true;
    })
    // An error occured, decide what to do next.
    .catch(function(err) {
      if (err.code === 'ENOENT') {
        // File does not exist, so return false.
        return false;
      } else {
        // An unexpected error occured so wrap and throw it.
        throw new VError(err,
          'Error reading boot2docker profile "%s".',
          profilePath
        );
      }
    });

  };

  /*
   * Set B2D Env
   */
  var setB2DEnv = function() {

    // Set the provider root directory as a environmental variable.
    setRootDirEnv();

    // Set Path environmental variable if we are on windows so we get access
    // to things like ssh.exe
    if (process.platform === 'win32') {

      // Get Path
      var gitBin = 'C:\\Program Files (x86)\\Git\\bin';

      // Only add the gitbin to the path if the path doesn't start with
      // it. We want to make sure gitBin is first so other things like
      // putty don't F with it.
      // See https://github.com/kalabox/kalabox/issues/342
      if (!_.startsWith(process.env.path, gitBin)) {
        kbox.core.env.setEnv('Path', [gitBin, process.env.Path].join(';'));
      }
    }

    // Add B2D executable path to path to handle weird situations where
    // the user may not have B2D in their path
    var pathString = (process.platform === 'win32') ? 'Path' : 'PATH';
    var pathSep = (process.platform === 'win32') ? ';' : ':';
    var b2dPath = bin.getB2DBinPath();
    if (!_.startsWith(process.env.path, b2dPath)) {
      var newPath = [b2dPath, process.env[pathString]].join(pathSep);
      kbox.core.env.setEnv(pathString, newPath);
    }

  };

  /*
   * Returns a cached instance of the provider profile.
   */
  var profileInstance = _.once(function() {

    // Read contents of profile file.
    return Promise.fromNode(function(cb) {
      fs.readFile(getProfilePath(), {encoding: 'utf8'}, cb);
    })
    // Build profile object using contents of profile file.
    .then(function(data) {

      // Get list of lines.
      var lines = data.split('\n');

      // Build profile object.
      var profile =
        // Start chain with lines from profile file.
        _.chain(lines)
        // Filter out any uninteresting lines.
        .filter(function(line) {
          var isComment = _.startsWith(line, '#');
          var isEmpty = _.isEmpty(line);
          var isKeyValue = _.contains(line, '=');
          return !isComment && !isEmpty && isKeyValue;
        })
        // Reduce list of interesting lines to an object.
        .reduce(function(profile, line) {
          // Split on equals sign, and trim the parts.
          var parts = _.map(line.split('='), _.trim);
          if (parts.length === 2) {
            // Use parts as key value to add property to object.
            profile[parts[0]] = parts[1];
          }
          return profile;
        }, {})
        // End chain.
        .value();

      return profile;

    });

  });

  // Build module function.
  return {
    hasProfile: hasProfile,
    setB2DEnv: setB2DEnv,
    profileInstance: profileInstance
  };

};
