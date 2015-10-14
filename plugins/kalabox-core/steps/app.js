'use strict';

/**
 * This contains things to help app updates
 */

module.exports = function(kbox) {

  // Native modules
  var path = require('path');

  // Npm modules
  var _ = require('lodash');
  var fs = require('fs-extra');
  var rmdir = require('rimraf');

  // Kalabox modules
  var Promise = kbox.Promise;

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

    // Parse the string if we can
    var typeVersion;
    if (pkgString) {
      var parts = pkgString.split('@');
      typeVersion = parts[1];
    }
    else {
      typeVersion = '0';
    }

    // If they are different or version has not yet been set
    // then we need to update
    return appVersion === undefined || appVersion !== typeVersion;
  };

  /*
   * Helper function to get app json data
   * cant use require because require caches
   */
  var readFileJSON = function(file) {

    // If its real return the version
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }

    // Otherwise fail
    return false;

  };

  /*
   * Get app package json
   */
  var getAppPkgJSON = function(app) {

    var pkgJsonPath = path.join(app.root, 'package.json');
    return readFileJSON(pkgJsonPath);

  };

  /*
   * Get app kalabox json
   */
  var getAppKboxJSON = function(app) {

    var pkgJsonPath = path.join(app.root, 'kalabox.json');
    return readFileJSON(pkgJsonPath);

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
    var oldKj = getAppKboxJSON(app);
    var oldPj = getAppPkgJSON(app);

    return kbox.create.copyAppSkeleton(appSpoof, app.root)

    // Make sure we dont lose older data
    .then(function() {

      // Get current versions of things
      var newKj = getAppKboxJSON(app);
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

  /*
   * In version 0.10.3 and above we've moved the app CIDS into sysConfRoot
   * so we can better manage maintenance of "orphaned" apps. This function
   * attempts to update pre 0.10.3 apps so their CIDS are in the new canonical
   * location
   */
  var updateAppCids = function(app) {

    // If no old app CID folder then continue
    var oldCidDir = path.join(app.root, '.cids');
    if (!fs.existsSync(oldCidDir)) {
      return Promise.resolve();
    }

    // Get old CID dir contents
    return Promise.each(fs.readdirSync(oldCidDir), function(cid) {
      // Define old and new CIDS
      var oldCidPath = path.join(oldCidDir, cid);
      var newCid = ['kb', app.name, cid].join('_');
      var newCidPath = path.join(app.config.appCidsRoot, newCid);

      // Copy the old to the new
      fs.copySync(oldCidPath, newCidPath, {clobber: true});
    })

    // Remove the old CID directory
    .then(function() {
      return Promise.fromNode(function(cb) {
        rmdir(oldCidDir, cb);
      });
    });

  };

  return {
    getAppVersion: getAppVersion,
    needsUpdates: needsUpdates,
    updateAppCode: updateAppCode,
    updateAppCids: updateAppCids
  };

};
