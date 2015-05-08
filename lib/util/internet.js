'use strict';

/**
 * Kalabox module for cheking internet access.
 * @module kbox.util.internet
 */

var dns = require('dns');

/**
 * Resolve a DNS query against a given URL to validate Internet access.
 * @arg {string} url - URL to do a DNS query for.
 * @arg {function} callback - Callback function.
 * @arg {error} callback.err - Possible error if there is no Internet access.
 * @example
 * kbox.util.internet.check('http://google.com', function(err) {
 *   if (err) {
 *    throw err;
 *   }
 *   console.log('We have internet access! Download all TeH things!!!!');
 * });
 */
exports.check = function(url, callback) {
  dns.resolve(url, function(err, data) {
    callback(err);
  });
};
