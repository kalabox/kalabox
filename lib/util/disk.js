/**
 * Kalabox disk utility module.
 * @name disk
 * @memberof core
 */

'use strict';

// Npm modules
var fs = require('fs-extra');

// Kalabox modules
var deps = require('../core/deps.js');

/**
 * Gets the temp directory and creates it if needed
 * @memberof core.disk
 * @example
 * var downloadDir = kbox.util.disk.getTempDir();
 */
exports.getTempDir = function() {
  return deps.call(function(globalConfig) {
    var dir = globalConfig.downloadsRoot;
    if (!fs.existsSync(dir)) {
      fs.mkdirpSync(dir);
    }
    return dir;
  });
};
