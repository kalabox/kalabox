
'use strict';

/**
 * Kalabox disk utility module.
 * @name disk
 * @memberof core
 */

// Npm modules
var diskspace = require('diskspace');
var fs = require('fs-extra');
var _ = require('lodash');

// Kalabox modules
var deps = require('../core/deps.js');
var shell = require('./shell.js');
var Promise = require('../promise.js');
var windows = require('./windows.js');

/**
 * Gets the UUID of the Max OSX volume
 * @memberof core.disk
 * @example
 * return kbox.util.disk.getMacVolume()
 *
 * .then(function(uuid) {
 *   return uuid;
 * })
 */
exports.getMacVolume = function() {

  // Set up our OSX command to check this
  var cmd = ['diskutil', 'info', '/'];

  // Run our command to check if we are blocking all ports
  return shell.exec(cmd)

  // Return true if blocked all is disabled
  .then(function(data) {
    return data;
  });

};

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

/*
 * A non-drivespace solution to get our free disk size
 * @todo: doing this because drivespace requires .NET 3.5 framework, wtf?
 */
var getWin32DiskProp = function(prop) {

  // Windows 7 does not allow fsutil to run in un-elevated mode and its
  // difficult (impossible?) to vb script an elevated cmd that returns
  // stdout so ... we assume disk is ok and return 250GB as our free disk
  // size. Given windows 7 is no longer mainstream supported i think this is
  // the best way to go. A consequence of this is we have to set the win7
  // kbox vm to a modest 20GB size
  if (windows.getFlavor() === '7') {
    switch (prop) {
      case 'status': return Promise.resolve('READY');
      case 'free': return Promise.resolve(21474836480);
    }
  }

  // Set up our cmd.exe command for this
  var sysDrive = process.env.SystemDrive;
  var cmd = ['fsutil', 'volume', 'diskfree', sysDrive];

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
 * @memberof core.disk
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
 * @memberof core.disk
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
