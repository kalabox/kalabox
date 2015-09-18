'use strict';

/**
 * Kalabox module for cheking internet access.
 * @module kbox.util.internet
 */

// NPM modules
var dns = require('dns');
var Promise = require('bluebird');
var _ = require('lodash');

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
exports.check = function(url) {

  // Run our command to check if we are blocking all ports
  return Promise.fromNode(function(cb) {
    dns.resolve(url, cb);
  })

  // Check that we have resolved to an IP address
  .then(function(data) {
    return !_.isEmpty(data);
  })

  .catch(function(err) {
    // @todo: log the error somewhere
    return false;
  });

};
