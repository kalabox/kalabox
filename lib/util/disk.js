
'use strict';

/**
 * Kalabox disk utility module.
 * @module kbox.util.disk
 */

// Npm modules
var diskspace = require('diskspace');
var fs = require('fs-extra');
var _ = require('lodash');

// Kalabox modules
var deps = require('../core/deps.js');
var shell = require('./shell.js');
var Promise = require('../promise.js');

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
  return shell.exec(cmd)

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
 * A non-drivespace solution to get our free disk size
 * @todo: doing this because drivespace requires .NET 3.5 framework, wtf?
 */
var getWin32DiskProp = function(prop) {

  // Set up our cmd.exe command for this
  var sysDrive = process.env.SystemDrive;
  var cmd = 'fsutil volume diskfree ' + sysDrive;

  // Run the thing
  return shell.exec(cmd)

  // Return the data
  .then(function(data) {

    // Split up our data
    var pieces = data.split('\r\n');

    // Return the status
    if (prop === 'status') {
      return (!_.isEmpty(data)) ? 'READY' : 'NOTREADY';
    }

    // Or the free space
    else if (prop === 'free') {
      var free = _.last(pieces[0].split(':'));
      return _.trim(free);
    }

    // Or the total space
    else {
      return _.trim(_.last(pieces[1].split(':')));
    }

  });
};

/*
 * Delegated thing
 */
var getPosixDiskProp = function(prop) {

  // Get some info about our disk
  return Promise.fromNode(function(cb) {
    diskspace.check('/', cb);
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

/*
 * Return a result from a diskspace.check
 */
var getDiskProp = function(prop) {

  // Return path based on platform
  switch (process.platform) {
    case 'win32': return getWin32DiskProp(prop);
    case 'darwin': return getPosixDiskProp(prop);
    case 'linux': return getPosixDiskProp(prop);
  }

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
