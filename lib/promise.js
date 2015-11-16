'use strict';

// Load a promise library.
var Promise = require('bluebird');
var VError = require('verror');

// Use long stack traces.
Promise.longStackTraces();

// Override the original nodeify function.
Promise.prototype.nodeify = function(callback) {

  // If callback is provided, ensure it's a function.
  if (callback && typeof callback !== 'function') {

    throw new Error('Invalid callback function: ' + callback);

  }

  // Then follow the default nodeify function by using alias.
  return this.asCallback(callback);

};

/*
 * Retry the function fn up to opts.max times until it successfully completes
 * without an error. Pause opts.backoff * retry miliseconds between tries.
 */
Promise.retry = function(fn, opts) {

  // Setup default options.
  opts = opts || {};
  opts.max = opts.max || 3;
  opts.backoff = opts.backoff || 1000;

  // Recursive function.
  var rec = function(counter) {

    // Call function fn within the context of a Promise.
    return Promise.try(fn)
    // Handle errors.
    .catch(function(err) {

      // If we haven't reached max retries, delay for a short while and
      // then retry.
      if (counter < opts.max) {

        return Promise.delay(opts.backoff * counter)
        .then(function() {
          return rec(counter + 1);
        });

      } else {

        // No retries left so wrap and throw the error.
        throw new VError(
          err,
          'Failed after %s retries. %s',
          opts.max,
          JSON.stringify(opts)
        );

      }
    });

  };

  // Init recursive function.
  return rec(1);

};

// Export the constructor.
module.exports = Promise;
