'use strict';

var _ = require('lodash');
var Promise = require('../../promise.js');
var core = require('../../core.js');
var VError = require('verror');

/*
 * Lazy load restler because it's a beefy module.
 */
var rest = _.once(function() {
  return require('restler');
});

/*
 * Headers for REST calls.
 */
var _headers = {
  'Accept': '*/*',
  'User-Agent': 'Kalabox Sync',
  'X-API-Key': '1B-YGWshy-KP55mN06eLzaA9EXsxeU5t'
};

/*
 * Common request function.
 */
var request = function(action, address, verb, data) {

  // Options.
  var opts = {
    headers: _headers
  };

  // Default data.
  if (!data) {
    data = '{}';
  }

  // Build URL.
  var url = address + '/rest/' + verb;

  // Get request.
  return Promise.try(function() {
    if (action === 'get') {
      // Return a get request.
      return rest().get(url, opts);
    } else if (action === 'post') {
      // Return a post request.
      return rest().postJson(url, data, opts);
    } else {
      // Invalid action so throw an error.
      throw new Error('Invalid action: ' + action);
    }
  })
  // Handle response.
  .then(function(req) {
    return new Promise(function(fulfill, reject) {
      req
      .on('success', function(data) {
        fulfill(data);
      })
      .on('fail', function(data) {
        reject(new Error(data));
      })
      .on('error', function(err) {
        reject(new Error(['syncthing', url, err].join(' -> ')));
      });
    });
  })
  // Log success.
  .tap(function(data) {
    var msg = ['SYNC REST', action, url].join(' => ');
    core.log.debug(msg, data);
  });

};

/*
 * Wrapper for request function to handle timeouts and retries.
 */
var requestWrapper = function(action, address, verb, data, opts) {

  // Default options.
  var defaults = {
    counter: 3,
    interval: 3,
    timeout: 15
  };

  // Merge options with default options.
  opts = _.extend(defaults, opts);

  // Recursive function for requests.
  var rec = function(counter) {

    // Try making REST request.
    return Promise.try(function() {
      return request(action, address, verb, data);
    })
    // Handle errors.
    .catch(function(err) {

      // List of expected errors.
      var expectedErrors = ['ECONNREFUSED', 'ECONNRESET', 'EPIPE'];

      // Is this error expected?
      var isExpectedError = _.any(expectedErrors, function(msg) {
        return _.contains(err.message, msg);
      });

      // @todo: @bcauldwell - Would also be nice to have a wrapped error
      // when max number of tries is reached.

      if (counter > 0 && isExpectedError) {

        // This error sometimes happens so wait an interval and then retry.
        return Promise.delay(opts.interval * 1000)
        .then(function() {
          return rec(counter - 1);
        });

      } else {

        // Rethrow error.
        throw err;

      }

    });

  };

  // Run recursive function.
  return rec(opts.counter)
  // Set a timeout.
  .timeout(opts.timeout * 1000)
  // Wrap timeout errors.
  .catch(Promise.TimeoutError, function(err) {

    throw new VError(err,
      'Error REST request: action=%s address=%s verb=%s data=%s opts=%s.',
      action, address, verb, data, opts
    );

  });

};

/*
 * Get request function.
 */
var get = function(address, verb, opts) {
  return requestWrapper('get', address, verb, null, opts);
};

/*
 * Post JSON request function.
 */
var postJson = function(address, verb, opts, data) {
  return requestWrapper('post', address, verb, data, opts);
};

/*
 * Build API for module.
 */
var api = {
  completionDevice: function(address, device, opts) {
    return get(address, 'db/completion?device=' + device, opts);
  },
  completionFolder: function(address, folder, opts) {
    return get(address, 'db/completion?device=' + folder, opts);
  },
  config: function(address, opts) {
    return get(address, 'system/config', opts);
  },
  configPost: function(address, config, opts) {
    return postJson(address, 'system/config', opts, config);
  },
  configSync: function(address, opts) {
    return get(address, 'system/config/insync', opts);
  },
  connections: function(address, opts) {
    return get(address, 'system/connections', opts);
  },
  discovery: function(address, opts) {
    return get(address, 'system/discovery', opts);
  },
  errors: function(address, opts) {
    return get(address, 'system/errors', opts);
  },
  hint: function(address, deviceId, hintAddress, opts) {
    if (!hintAddress) {
      hintAddress = 'dynamic';
    }
    return postJson(address,
      'system/discovery/hint',
      opts,
      {device: deviceId, addr: hintAddress});
  },
  model: function(address, folder, opts) {
    return get(address, 'db/status?folder=' + folder, opts);
  },
  ping: function(address, opts) {
    return get(address, 'system/ping', opts);
  },
  pingVersion10: function(address, opts) {
    return get(address, 'ping', opts);
  },
  restart: function(address, opts) {
    return postJson(address, 'system/restart', opts, null);
  },
  shutdown: function(address, opts) {
    return postJson(address, 'system/shutdown', opts, null);
  },
  shutdownVersion10: function(address, opts) {
    return postJson(address, 'shutdown', opts, null);
  },
  system: function(address, opts) {
    return get(address, 'system/status', opts);
  },
  version: function(address, opts) {
    return get(address, 'system/version', opts);
  }
};

/*
 * Return API.
 */
module.exports = api;
