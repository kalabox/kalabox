'use strict';

/**
 * This contains things to help app updates
 */

module.exports = function(kbox) {

  // Native modules
  var path = require('path');
  var fs = require('fs');

  // Npm modules
  var _ = require('lodash');

  /*
   * Check whether we need an appUpdate or not
   */
  var needsUpdates = function(appVersion, type) {
    // Grab global config
    var globalConfig = kbox.core.deps.get('globalConfig');

    // Get the latest package version for this kind of app
    var pkgString = _.find(globalConfig.apps, function(app) {
      return _.includes(app, type);
    });

    // Parse the string
    var parts = pkgString.split('@');
    var typeVersion = parts[1];

    // If they are different than we need to update
    return appVersion !== typeVersion;
  };

  /*
   * Get app package json
   */
  var getAppPkgJSON = function(app) {

    // Gen the apps pj path
    var pkgJsonPath = path.join(app.root, 'package.json');

    // If its real return the version
    if (fs.existsSync(pkgJsonPath)) {
      return require(pkgJsonPath);
    }

    // Otherwise fail
    return false;

  };

  /*
   * Get app version
   */
  var getAppVersion = function(app) {
    var pj = getAppPkgJSON(app);
    if (pj !== false && pj.version) {
      return pj.version;
    }
  };

  /*
   * Update the apps code
   */
  var updateAppCode = function(app) {

    // Build data we need
    var appSpoof = {
      task: {
        module: app.config.appType
      }
    };

    // Save old copies of things so we can mix stuff back in
    var oldKj = require(path.join(app.root, 'kalabox.json'));
    var oldPj = getAppPkgJSON(app);

    return kbox.create.copyAppSkeleton(appSpoof, app.root)

    // Make sure we dont lose older data
    .then(function() {

      // Get current versions of things
      var newKj = require(path.join(app.root, 'kalabox.json'));
      var newPj = getAppPkgJSON(app);

      // Reset the names
      newPj.name = oldPj.name;
      newKj.appName = oldKj.appName;

      // Merge in new plugin conf
      newKj.pluginConf = _.merge(newKj.pluginConf, oldKj.pluginConf);

      // Update our files
      var newPjFile = path.join(app.root, 'package.json');
      var newKjFile = path.join(app.root, 'kalabox.json');
      fs.writeFileSync(newPjFile, JSON.stringify(newPj, null, 2));
      fs.writeFileSync(newKjFile, JSON.stringify(newKj, null, 2));

    });

  };

  return {
    getAppVersion: getAppVersion,
    needsUpdates: needsUpdates,
    updateAppCode: updateAppCode
  };

};
