'use strict';

/**
 * Kalabox module for cheking internet access.
 */

// NPM modules
var Promise = require('../promise.js');
var _ = require('lodash');
var http = require('http');

// Logging
var log = require('../core.js').log.make('UTIL INTERNET');

/**
 * Resolve a DNS query against a given URL to validate Internet access.
 * @arg {function} callback - Callback function.
 * @arg {error} callback.err - Possible error if there is no Internet access.
 * @example
 * kbox.util.internet.check(function(err) {
 *   if (err) {
 *    throw err;
 *   }
 *   console.log('We have internet access! Download all TeH things!!!!');
 * });
 */
exports.check = function(callback) {

  // List of URLS to get, so that if none of them responded it would either
  // be the end of the world or you have no Internet connection.
  var urls = [
    'http://www.google.com',
    'http://www.w3.org',
    'http://pingtest.net'
  ];

  // Retry options.
  var retryOpts = {
    max: 7,
    backoff: 1000
  };

  // Regular expression for checking status codes.
  var regex = new RegExp(/^[23][0-9][0-9]$/);

  // Try to reach the Internet inside of a promise retry.
  return Promise.retry(function(counter) {

    // Let the user know what we are doing.
    log.debug('Checking connection to the Internet: ' + counter);

    // List of requests for us to cancel later.
    var requests = [];

    // Build an array of request promises.
    var checks = _.map(urls, function(url) {
      return Promise.fromNode(function(cb) {
        // Get URL.
        var req = http.get(url, function(res) {
          if (regex.test(res.statusCode.toString())) {
            cb();
          } else {
            cb(new Error('Status code: ' + res.statusCode));
          }
        })
        .on('error', function(err) {
          cb(err);
        });
        // Add to list of requests so we can cancel the losers.
        requests.push(req);
      });
    });

    // Wait until one url get request fulfills.
    return Promise.any(checks)
    // Abort the remaining requests.
    .then(function() {
      return Promise.map(requests, function(req) {
        req.abort();
      });
    });

  }, retryOpts)
  // Log success.
  .then(function() {
    log.debug('OK');
  })
  // Wrap errors.
  .catch(function() {
    throw new Error('The Internet is unreachable!');
  })
  // Return.
  .nodeify(callback);

};
