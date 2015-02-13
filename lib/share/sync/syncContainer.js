'use strict';

var Promise = require('bluebird');
var kbox = require('../../kbox.js');

var CONTAINER_NAME = 'kalabox_syncthing';

var isInstalled = exports.isInstalled = function() {
  return new Promise(function(fulfill, reject) {
    kbox.engine.exists(CONTAINER_NAME, function(err, exists) {
      if (err) {
        reject(err);
      } else {
        fulfill(exists);
      }
    });
  });
};

exports.isRunning = function() {
  return new Promise(function(fulfill, reject) {
    kbox.engine.inspect(CONTAINER_NAME, function(err, data) {
      if (err) {
        reject(err);
      } else {
        fulfill(data.State.Running);
      }
    });
  });
};

exports.create = function(binds) {
  console.log('Binds => ' + JSON.stringify(binds, null, '  '));
  var opts = {
    Image: 'kalabox/syncthing:stable',
    name: 'kalabox_syncthing',
    HostConfig: {
      Binds: binds,
      NetworkMode: 'bridge',
      PortBindings: {
        '8080/tcp': [{'HostIp': '', 'HostPort': '8080'}],
        '22000/tcp': [{'HostIp': '', 'HostPort': '22000'}],
        '21025/udp': [{'HostIp': '', 'HostPort': '21025'}],
        '21026/udp': [{'HostIp': '', 'HostPort': '21026'}]
      }
    }
  };
  return new Promise(function(fulfill, reject) {
    kbox.engine.create(opts, function(err) {
      if (err) {
        reject(err);
      } else {
        fulfill();
      }
    });
  });
};

exports.remove = function() {
  return new Promise(function(fulfill, reject) {
    kbox.engine.remove(CONTAINER_NAME, function(err) {
      if (err) {
        reject(err);
      } else {
        var rec = function(attempts) {
          if (attempts === 0) {
            reject(new Error('Could not remove container ' + CONTAINER_NAME));
          } else {
            isInstalled()
            .then(function(isInstalled) {
              if (!isInstalled) {
                fulfill();
              } else {
                setTimeout(function() {
                  rec(attempts - 1);
                }, 3000);
              }
            });
          }
        };
        rec(10);
      }
    });
  });
};

exports.start = function(options) {
  return new Promise(function(fulfill, reject) {
    kbox.engine.start(CONTAINER_NAME, function(err) {
      if (err) {
        reject(err);
      } else {
        fulfill();
      }
    });
  });
};

exports.stop = function() {
  return new Promise(function(fulfill, reject) {
    kbox.engine.stop(CONTAINER_NAME, function(err) {
      if (err) {
        reject(err);
      } else {
        fulfill();
      }
    });
  });
};
