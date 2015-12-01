
'use strict';

/**
 * Kalabox disk utility module.
 * @module kbox.util.disk
 */

// Npm modules
var diskspace = require('diskspace');
var fs = require('fs-extra');
var Promise = require('bluebird');

// Kalabox modules
var deps = require('../core/deps.js');
var shell = require('./shell.js');

/**
 * Gets the UUID of the Max OSX volume
 * @arg {boolean} callback.uuid - UUID of the Volume
 * @example
 * return kbox.util.disk.getMacVolume()
 *
 * .then(function(uuid) {
 *   return uuid;
 * })
 */
exports.getMacVolume = function() {

  // Set up our OSX command to check this
  var cmd = 'diskutil info /';

  // Run our command to check if we are blocking all ports
  return Promise.fromNode(function(cb) {
    shell.exec(cmd, cb);
  })

  // Return true if blocked all is disabled
  .then(function(data) {
    return data;
  });

};

/**
 * Gets the temp directory and creates it if needed
 * @arg {boolean} callback.uuid - UUID of the Volume
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

/*
 * Return a result from a diskspace.check
 */
var getDiskProp = function(prop) {

  // Choose a drive based on platform
  var volume = (process.platform === 'win32') ? 'C' : '/';

  // Get some info about our disk
  return Promise.fromNode(function(cb) {
    diskspace.check(volume, cb);
  })

  // Return the piece we want
  .then(function(data) {

    // Return the status
    if (prop === 'status') {
      return data[2].trim();
    }

    // Or the free space
    else if (prop === 'free') {
      return data[1];
    }

    // Or the total space
    else {
      return data[0];
    }

  })

  // Catch any errors
  .catch(function(err) {
    throw new Error(err);
  });
};

/**
 * Gets the FREE space on the volume
 * @arg {boolean} callback.freeSpace - freespace on the Volume
 * @example
 * return kbox.util.disk.getDiskFreeSpace()
 *
 * .then(function(freeSpace) {
 *   // something to with free space
 * })
 */
exports.getDiskFreeSpace = function() {
  return getDiskProp('free');
};

/**
 * Gets the status of the volume
 * @arg {boolean} callback.status - Status of the Volume
 * @example
 * return kbox.util.disk.getDiskStatus()
 *
 * .then(function(status) {
 *   // something to with status
 * })
 */
exports.getDiskStatus = function() {
  return getDiskProp('status');
};
