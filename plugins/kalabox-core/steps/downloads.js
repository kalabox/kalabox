'use strict';

/**
 * This contains some helpers to the download step
 */

module.exports = function(kbox) {

  var fs = require('fs');
  var path = require('path');

  /*
   * Validate that our downloads are all good and proper
   */
  var validateDownloads = function(downloads) {

    // Are the downloads an array?
    if (!Array.isArray(downloads)) {
      return 'Invalid download array: ' + JSON.stringify(downloads);
    }

    // Make sure each element of the array is a string
    downloads.forEach(function(download, index) {
      if (typeof download !== 'string' || download.length < 1) {
        return 'Invalid download: index: ' + index + ' cmd: ' + download;
      }
    });

    // Nope! WE GOOD!
    return true;

  };

  /*
   * Quick check that we need the diskspace exe
   */
  var needsDiskspace = function() {
    var sysRoot = kbox.core.deps.get('globalConfig').sysConfRoot;
    return !fs.existsSync(path.join(sysRoot, 'downloads', 'drivespace.exe'));
  };

  /*
   * Quick check that we need the invis.vbs
   */
  var needsElevate = function() {
    var sysRoot = kbox.core.deps.get('globalConfig').sysConfRoot;
    var elRoot = path.join(sysRoot, 'downloads', 'elevate');
    return !fs.existsSync(elRoot + '.cmd') || !fs.existsSync(elRoot + '.vbs');
  };

  return {
    needsDiskspace: needsDiskspace,
    needsElevate: needsElevate,
    validate: validateDownloads
  };

};
