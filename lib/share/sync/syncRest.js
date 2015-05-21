'use strict';

var _ = require('lodash');
var Promise = require('../../promise.js');
var core = require('../../core.js');

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
 * Get request function.
 */
var get = function(address, verb) {
  return request('get', address, verb, null);
};

/*
 * Post JSON request function.
 */
var postJson = function(address, verb, data) {
  return request('post', address, verb, data);
};

/*
 * Build API for module.
 */
var api = {
  completionDevice: function(address, device) {
    return get(address, 'db/completion?device=' + device);
  },
  completionFolder: function(address, folder) {
    return get(address, 'db/completion?device=' + folder);
  },
  config: function(address) {
    return get(address, 'system/config');
  },
  configPost: function(address, config) {
    return postJson(address, 'system/config', config);
  },
  configSync: function(address) {
    return get(address, 'system/config/insync');
  },
  connections: function(address) {
    return get(address, 'system/connections');
  },
  discovery: function(address) {
    return get(address, 'system/discovery');
  },
  errors: function(address) {
    return get(address, 'system/errors');
  },
  hint: function(address, deviceId, hintAddress) {
    if (!hintAddress) {
      hintAddress = 'dynamic';
    }
    return postJson(address,
      'system/discovery/hint',
      {device: deviceId, addr: hintAddress});
  },
  model: function(address, folder) {
    return get(address, 'db/status?folder=' + folder);
  },
  ping: function(address) {
    return get(address, 'system/ping');
  },
  pingVersion10: function(address) {
    return get(address, 'ping');
  },
  restart: function(address) {
    return postJson(address, 'system/restart', null);
  },
  shutdown: function(address) {
    return postJson(address, 'system/shutdown', null);
  },
  shutdownVersion10: function(address) {
    return postJson(address, 'shutdown', null);
  },
  system: function(address) {
    return get(address, 'system/status');
  },
  version: function(address) {
    return get(address, 'system/version');
  }
};

/*
 * Return API.
 */
module.exports = api;
