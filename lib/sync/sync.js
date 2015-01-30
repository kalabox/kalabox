'use strict';

var rest = require('./syncthingRest.js');
var Promise = require('bluebird');
var _ = require('lodash');

function Sync(address) {
  this.address = address;
}

Sync.prototype.getConfig = function() {
  return rest.config(this.address);
};

Sync.prototype.setConfig = function(config) {
  return rest.configPost(this.address, config);
};

/*Sync.prototype.testChangeConfig = function() {
  var self = this;
  return this.getConfig()
    .then(function(config) {
      config.Options.RestartOnWakeup = !config.Options.RestartOnWakeup;
      return config;
    })
    .then(self.setConfig);
};*/

Sync.prototype.getDeviceId = function() {
  return rest.config(this.address)
    .then(function(config) {
      return config.Devices[0].DeviceID;
    });
};

Sync.prototype.hint = function(deviceId) {
  return rest.hint(this.address, deviceId);
};

Sync.prototype.addDevice = function(remoteSync) {
  var self = this;
  return Promise.join(
    self.getDeviceId(),
    remoteSync.getConfig(),
    function(deviceId, config) {
      var deviceAlreadyExists = _.find(config.Devices, function(device) {
        return device.DeviceID === deviceId;
      });
      console.log('deviceAlreadyExists: ' + deviceAlreadyExists);
      if (deviceAlreadyExists === undefined) {
        var device = {
          DeviceID: deviceId,
          Name: deviceId,
          Addresses: ['dynamic'],
          Compression: true,
          CertName: '',
          Introducer: false
        };
        config.Devices.push(device);
      } else {
        console.log('asdfdf');
      }
      return remoteSync.setConfig(config)
        .then(function() {
          console.log('LINK: Added device="' +
            deviceId +
            '" to address="' + remoteSync.address + '"');
        });
    });
};

Sync.prototype.addFolder = function(id, path, remoteSync, overrideOptions) {
  var options = {
    ReadOnly: false,
    RescanIntervalS: 5,
    IgnorePerms: true,
    Versioning: {
      Type: '',
      Params: {}
    },
    LenientMtimes: false,
    Copiers: 1,
    Pullers: 16,
    Hashers: 0,
    Invalid: ''
  };
  var self = this;
  return Promise.join(
    self.getDeviceId(),
    self.getConfig(),
    remoteSync.getDeviceId(),
    function(deviceId, config, remoteDeviceId) {
      var devices = _.map([deviceId, remoteDeviceId],
        function(id) { return {DeviceID: id}; });
      var folder = {
        ID: id,
        Path: path,
        Devices: devices,
        ReadOnly: false,
        RescanIntervalS: options.RescanIntervalS,
        IgnorePerms: options.IgnorePerms,
        Versioning: options.Versioning,
        LenientMtimes: options.LenientMtime,
        Copiers: 1,
        Pullers: 16,
        Hashers: 0,
        Invalid: ''
      };
      var folderAlreadyExists = _.find(config.Folders,
        function(folder) { return folder.id === id; });
      if (folderAlreadyExists !== undefined) {
        throw new Error('Folder already exists!');
      } else {
        config.Folders.push(folder);
        return config;
      }
    })
    .then(function(config) { return self.setConfig(config); });
};

Sync.prototype.linkDevices = function(sync) {
  return this.addDevice(sync)
    .then(sync.addDevice(this));
};

Sync.prototype.ping = function() {
  return rest.ping(this.address);
};

Sync.prototype.restart = function() {
  var self = this;
  console.log('RESTARTING: ' + self.address);
  return rest.restart(self.address)
    .then(function() {
      return console.log('RESTARTED: ' + self.address);
    });
};

module.exports = Sync;
