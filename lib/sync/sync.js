'use strict';

var rest = require('./syncthingRest.js');
var Promise = require('bluebird');

function Sync(address) {
  this.address = address;
}

Sync.prototype.__getConfig__ = function() {
  return rest.config(this.address);
};

Sync.prototype.__setConfig__ = function(config) {
  return rest.configPost(this.address, config);
};

Sync.prototype.__testChangeConfig__ = function() {
  var self = this;
  return this.__getConfig()
    .then(function(config) {
      config.Options.RestartOnWakeup = !config.Options.RestartOnWakeup;
      return config;
    })
    .then(self.__setConfig__);
};

Sync.prototype.test = function() {
  return this.__testChangeConfig();
};

Sync.prototype.getDeviceId = function() {
  return rest.config(this.address)
    .then(function(config) {
      return config.Devices[0].DeviceID;
    });
};

Sync.prototype.hint = function(deviceId) {
  return rest.hint(this.address, deviceId);
};

Sync.prototype.__link__ = function(sync) {
  var self = this;
  return Promise.join(self.getDeviceId(), sync.__getConfig__(),
    function(deviceId, config) {
      console.log('debug-2');
      var device = {
        DeviceID: deviceId,
        Name: deviceId,
        Addresses: ['dynamic'],
        Compression: true,
        CertName: '',
        Introducer: false
      };
      config.Devices.push(device);
      return sync.__setConfig__(config);
    });
};

Sync.prototype.linkDevices = function(sync) {
  return this.__link__(sync)
    .then(sync.__link__(this));
};

Sync.prototype.ping = function() {
  return rest.ping(this.address);
};

Sync.prototype.restart = function() {
  return rest.restart(this.address);
};

module.exports = Sync;
