/**
 * Module to determine if the target OS has a package installed
 * @module kbox.util.pkg
 */

'use strict';

// npm modules
var _ = require('lodash');

// Kalabox modules
var shell = require('./shell.js');
var install = require('../install.js');
var Promise = require('../promise.js');

/*
 * Helper function for linux
 */
var existsLinux = function(pkg) {

  // Get linux flavor
  var flavor = install.linuxOsInfo.getFlavor();

  // @todo: other flavors
  if (flavor !== 'debian') {
    return Promise.resolve(false);
  }
  // Check to see if this package is already installed
  else {

    // Cmd to run
    var cmd = 'dpkg-query -f \'${binary:Package}\n\' -W | grep ' + pkg;

    // Get network information from virtual box.
    return Promise.fromNode(function(cb) {
      shell.exec(cmd, cb);
    })

    .catch(function(err) {
      // No results returns an error so we need to catch
    })

    // Parse the output
    .then(function(output) {

      // Define a null response
      if (output === undefined) {
        output = 'NO PACKAGE';
      }

      // Return result
      return _.contains(output.trim(), pkg);

    });
  }
};

/**
 * Returns whether a package exists or not
 * @todo: get to work on things other than debian
 * @arg {string} package - The package to check
 */
exports.exists = function(pkg) {

  // Return path based on platform
  switch (process.platform) {
    case 'win32': return Promise.resolve(false);
    case 'darwin': return Promise.resolve(false);
    case 'linux': return existsLinux(pkg);
  }

};
