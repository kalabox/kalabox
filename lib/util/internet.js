'use strict';

/**
 * Kalabox module for cheking internet access.
 * @module kbox.util.internet
 */

// NPM modules
var Promise = require('../promise.js');
var _ = require('lodash');
var http = require('http');
var VError = require('verror');
var log = require('../core.js').log.make('INTERNET');

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
    'http://www.amazon.com'
  ];

  // Retry options.
  var retryOpts = {
    max: 7,
    backoff: 1000
  };

  // Try to reach the Internet inside of a promise retry.
  return Promise.retry(function(counter) {

    // Let the user know what we are doing.
    log.info('Checking connection to the Internet: ' + counter);

    // Build an array of request promises.
    var requests = _.map(urls, function(url) {
      return Promise.fromNode(function(cb) {
        // Get URL.
        http.get(url, function(res) {
          if (res.statusCode === 200) {
            // Status code 200 tells us everything is ok!
            cb();
          } else {
            cb(new Error('Status code: ' + res.statusCode));
          }
        })
        .on('error', function(err) {
          cb(err);
        });
      })
      // Make sure we have a timeout.
      .timeout(5 * 1000);
    });

    // Wait until one url get request fulfills.
    return Promise.any(requests);

  }, retryOpts)
  // Wrap errors.
  .catch(function() {
    throw new Error('The Internet is unreachable!');
  })
  // Return.
  .nodeify(callback);

};
