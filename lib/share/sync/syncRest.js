'use strict';

var rest = require('restler');
var Promise = require('bluebird');
var core = require('../../core.js');

var _headers = {
  'Accept': '*/*',
  'User-Agent': 'Kalabox Sync',
  'X-API-Key': '1B-YGWshy-KP55mN06eLzaA9EXsxeU5t'
};

var logSuccess = function(method, url, data) {
  core.log.debug(['SYNC REST', method, url].join(' => '), data);
};

var get = function(address, verb) {
  var retriesLeft = 3;
  var options = {
    headers: _headers
  };
  var url = address + '/rest/' + verb;
  return new Promise(function(fulfill, reject) {
    rest.get(url, options)
    .on('success', function(data, resp) {
      logSuccess('get', url, data);
      fulfill(data);
    })
    .on('fail', function(data, resp) {
      // @todo: clean this up after it's no longer a prototype
      if (retriesLeft > 0) {
        retriesLeft -= 1;
        this.retry('3000');
      } else {
        reject(new Error(data));
      }
    })
    .on('error', function(err, resp) {
      var newErr = new Error('syncthing ' + url + ' (' + err + ')');
      reject(newErr);
    });
  });
};

// @todo: get and postJson should be merged into one path to reduce code dupes
var postJson = function(address, verb, data) {
  if (!data) {
    data = '{}';
  }
  var retriesLeft = 3;
  var options = {
    headers: _headers
  };
  var url = address + '/rest/' + verb;
  return new Promise(function(fulfill, reject) {
    rest.postJson(url, data, options)
    .on('success', function(data, resp) {
      logSuccess('post', url, data);
      fulfill(data);
    })
    .on('fail', function(data, resp) {
      // @todo: clean this up afte it's no longer a prototype
      if (retriesLeft > 0) {
        retriesLeft -= 1;
        this.retry('3000');
      } else {
        reject(new Error(data));
      }
    })
    .on('error', function(err, resp) {
      var newErr = new Error('syncthing ' + url + ' (' + err + ')');
      reject(newErr);
    });
  });
};

var api = {
  completionDevice: function(address, device) {
    return get(address, 'completion?device=' + device);
  },
  completionFolder: function(address, folder) {
    return get(address, 'completion?device=' + folder);
  },
  config: function(address) {
    return get(address, 'config');
  },
  configPost: function(address, config) {
    return postJson(address, 'config', config);
  },
  configSync: function(address) {
    return get(address, 'config/sync');
  },
  connections: function(address) {
    return get(address, 'connections');
  },
  discovery: function(address) {
    return get(address, 'discovery');
  },
  errors: function(address) {
    return get(address, 'errors');
  },
  hint: function(address, deviceId, hintAddress) {
    if (!hintAddress) {
      hintAddress = 'dynamic';
    }
    return postJson(address,
      'discovery/hint',
      {device: deviceId, addr: hintAddress});
  },
  model: function(address, folder) {
    return get(address, 'model?folder=' + folder);
  },
  ping: function(address) {
    return get(address, 'ping');
  },
  restart: function(address) {
    return postJson(address, 'restart', null);
  },
  shutdown: function(address) {
    return postJson(address, 'shutdown', null);
  },
  system: function(address) {
    return get(address, 'system');
  },
  version: function(address) {
    return get(address, 'version');
  }
};

module.exports = api;
