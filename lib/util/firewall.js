'use strict';

/**
 * Kalabox firewall utility module.
 * @module kbox.util.firewall
 */

// Npm modules
var Promise = require('bluebird');

// Kalabox modules
var shell = require('./shell.js');

/**
 * Gets status of firewall blocking everything.
 * **ONLY WORKS ON OSX**
 */
var isBlockingAll = function() {

  // @todo: Need support for other OS here
  if (process.platform !== 'darwin') {
    return Promise.resolve(false);
  }

  // Set up our OSX command to check this
  var cmd = [
    '/usr/libexec/ApplicationFirewall/socketfilterfw',
    '--getblockall'
  ];

  // Run our command to check if we are blocking all ports
  return shell.exec(cmd)

  // Return true if blocked all is disabled
  .then(function(response) {
    return (response !== 'Block all DISABLED! \n');
  });

};

/**
 * Gets status of firewall being in an okay state.
 * **ONLY WORKS ON OSX**
 * @arg {function} callback - Callback function.
 * @arg {error} callback.err - Possible error object.
 * @arg {boolean} callback.isOkay - Boolean result set to true if firewall is
 *   in an okay state.
 * @example
 * kbox.util.firewall.isOkay(function(err, isOkay) {
 *   if (err) {
 *     return throw err;
 *   }
 *   console.log('Firewall is in a good state -> ' + isOkay);
 * });
 */
exports.isOkay = function() {

  // Check if we are blocking all ports
  return isBlockingAll()

  // If we aren't then we are good
  .then(function(isBlockingAll) {
    return !isBlockingAll;
  });

};
