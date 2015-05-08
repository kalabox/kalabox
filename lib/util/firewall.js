'use strict';

/**
 * Kalabox firewall utility module.
 * @module kbox.util.firewall
 */

var shell = require('./shell.js');
var _ = require('lodash');

/**
 * Gets status of firewall blocking everything.
 * **ONLY WORKS ON OSX**
 * @arg {function} callback - Callback function.
 * @arg {error} callback.err - Possible error object.
 * @arg {boolean} callback.result - Boolean result set to true if firewall is
 *   blocking everything.
 * @example
 * kbox.util.firewall.isBlockingAll(function(err, isBlockingAll) {
 *   if (err) {
 *     throw err;
 *   } else if (isBlockingAll) {
 *     throw new Error('Firewall is blocking everything!');
 *   }
 * });
 */
exports.isBlockingAll = function(callback) {
  var cmd = '/usr/libexec/ApplicationFirewall/socketfilterfw --getblockall';
  shell.exec(cmd, function(err, data) {
    if (err) {
      callback(err);
    } else if (data === 'Block all DISABLED! \n') {
      callback(null, false);
    } else {
      callback(null, data);
    }
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
exports.isOkay = function(callback) {
  this.isBlockingAll(function(err, isBlockingAll) {
    callback(err, !isBlockingAll);
  });
};
