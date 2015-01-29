'use strict';

var rest = require('restler');

var _headers = {
  'Accept': '*/*',
  'User-Agent': 'Kalabox Sync',
  'X-API-Key': 'JaUtn8s95b1QlvtHi0kwZhischcOlMlD'
};

var get = function(address, verb, cb) {
  var retriesLeft = 3;
  var options = {
    headers: _headers
  };
  var url = address + '/rest/' + verb;
  rest.get(url, options)
  .on('success', function(data, resp) {
    cb(null, data);
  })
  .on('fail', function(data, resp) {
    if (retriesLeft > 0) {
      retriesLeft -= 1;
      this.retry('3000');
    } else {
      console.log('url: ' + url);
      throw new Error(data);
    }
  })
  .on('error', function(err, resp) {
    cb(err, null);
  });
};

var postJson = function(address, verb, data, cb) {
  if (!data) {
    data = '{}';
  }
  var retriesLeft = 3;
  var options = {
    headers: _headers
  };
  var url = address + '/rest/' + verb;
  rest.postJson(url, data, options)
  .on('success', function(data, resp) {
    cb(null, data);
  })
  .on('fail', function(data, resp) {
    if (retriesLeft > 0) {
      retriesLeft -= 1;
      console.log('retrying!')
      console.log(data);
      this.retry('3000');
    } else {
      console.log('url: ' + url);
      throw new Error(data);
    }
  })
  .on('error', function(err, resp) {
    cb(err, null);
  });
};

var api = {
  completionDevice: function(address, device, cb) {
    get(address, 'completion?device=' + device, cb);
  },
  completionFolder: function(address, folder, cb) {
    get(address, 'completion?device=' + folder, cb);
  },
  config: function(address, cb) {
    get(address, 'config', cb);
  },
  configPost: function(address, config, cb) {
    postJson(address, 'config', config, cb);
  },
  configSync: function(address, cb) {
    get(address, 'config/sync', cb);
  },
  connections: function(address, cb) {
    get(address, 'connections', cb);
  },
  discovery: function(address, cb) {
    get(address, 'discovery', cb);
  },
  errors: function(address, cb) {
    get(address, 'errors', cb);
  },
  hint: function(address, deviceId, hintAddress, cb) {
    postJson(address,
      'discovery/hint',
      { device: deviceId, addr: hintAddress },
      cb);
  },
  model: function(address, folder, cb) {
    get(address, 'model?folder=' + folder, cb);
  },
  ping: function(address, cb) {
    get(address, 'ping', cb);
  },
  restart: function(address, cb) {
    postJson(address, 'restart', null, cb);  
  },
  shutdown: function(address, cb) {
    postJson(address, 'shutdown', null, cb);  
  },
  system: function(address, cb) {
    get(address, 'system', cb);
  },
  version: function(address, cb) {
    get(address, 'version', cb);
  }
};

module.exports = api;
