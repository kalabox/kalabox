'use strict';

var path = require('path');
var rest = require('./syncthingRest.js');
var Promise = require('bluebird');
var _ = require('lodash');
var core = require('../core.js');
var spawn = require('child_process').spawn;

function Sync(ip) {
  this.ip = ip;
  this.address = ['http://', ip, ':8080'].join('');
}

Sync.prototype.getConfig = function() {
  return rest.config(this.address);
};

Sync.prototype.setConfig = function(config) {
  var self = this;
  //return rest.configPost(this.address, config);
  console.log('configIn: ' + JSON.stringify(config));
  return rest.configPost(this.address, config)
  .then(function() {
    return self.getConfig()
    .then(function(configOut) {
      console.log('configOut: ' + JSON.stringify(configOut));
    });
  });
};

Sync.prototype.getDeviceId = function() {
  return rest.system(this.address)
    .then(function(systemInfo) {
      return systemInfo.myID;
    });
};

Sync.prototype.hint = function(deviceId) {
  return rest.hint(this.address, deviceId);
};

Sync.prototype.ping = function() {
  return rest.ping(this.address);
};

Sync.prototype.wait = function() {
  var self = this;
  var interval = 3 * 1000;
  var attempts =  10;
  return new Promise(function(fulfill, reject) {
    var rec = function(attemptsLeft) {
      self.ping()
      .then(function() {
        fulfill();
      })
      .catch(function(err) {
        if (attemptsLeft === 0) {
          reject(err);
        } else {
          setTimeout(function() {
            rec(attemptsLeft - 1);
          }, interval);
        }
      });
    };
    rec(attempts);
  });
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
      if (deviceAlreadyExists === undefined) {
        var ip = (function() {
          if (self.ip === '127.0.0.1' || self.ip === '0.0.0.0') {
            return 'dynamic';
          } else {
            return self.ip;
          }
        })();
        var device = {
          DeviceID: deviceId,
          Name: deviceId,
          Addresses: [ip],
          Compression: true,
          CertName: '',
          Introducer: false
        };
        config.Devices.push(device);
      }
      return remoteSync.setConfig(config)
        .then(function() {
          console.log('LINK: Added device="' +
            deviceId +
            '" to address="' + remoteSync.address + '"');
        });
    });
};

Sync.prototype.clear = function() {
  var self = this;
  return self.getConfig()
    .then(function(config) {
      config.Devices = [];
      config.Folders = [];
      return self.setConfig(config);
    });
};

Sync.prototype.removeFolder = function(id) {
  var self = this;
  return self.getConfig()
    .then(function(config) {
      var folders = _.filter(config.Folders, function(folder) {
        return folder.ID !== id;
      });
      config.Folders = folders;
      return self.setConfig(config);
    });
};

Sync.prototype.addFolder = function(id, path, remoteSync, overrideOptions) {
  console.log('Adding folder: ' + id);
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
        function(x) { return {DeviceID: x}; });
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
        function(folder) { return folder.ID === id; });
      if (folderAlreadyExists === undefined) {
        config.Folders.push(folder);
      } else {
        config.Folders[folder.ID] = folder;
      }
      return config;
    })
    .then(function(config) {
      return self.setConfig(config);
    })
    .then(function() {
      return console.log('Added folder: ' + id);
    });
};

Sync.prototype.shareFolder = function(name, remoteSync) {
  var self = this;
  return core.deps.call(function(globalConfig) {
    var localPath = path.join(globalConfig.codeRoot, name);
    var remotePath = '/' + name;
    return self.addFolder(name, localPath, remoteSync)
      .then(function() {
        return remoteSync.addFolder(name, remotePath, self);
      })
      .then(function() {
        return console.log('Folder shared: ' + path);
      });
  });
};

Sync.prototype.linkDevices = function(sync) {
  var self = this;
  return self.addDevice(sync)
    .then(function() {
      return sync.addDevice(self);
    });
};

Sync.prototype.isUp = function() {
  var self = this;
  return self.ping()
    .then(function(data) {
      return true;
    })
    .catch(function(err) {
      if (err.message === 'connect ECONNREFUSED') {
        return false;
      } else {
        throw err;
      }
    });
};

Sync.prototype.restart = function() {
  var self = this;
  console.log('RESTARTING: ' + self.address);
  return rest.restart(self.address)
    .then(function() {
      return console.log('RESTARTED: ' + self.address);
    });
};

Sync.prototype.restartWait = function() {
  var self = this;
  return self.restart()
  .then(function() {
    return self.wait();
  });
};

Sync.prototype.shutdown = function() {
  return rest.shutdown(this.address);
};

Sync.prototype.start = function() {
  var self = this;
  // @todo: this only works for local syncthing for now
  var SYNCTHING_EXECUTABLE = path.join(
    core.deps.lookup('config').sysConfRoot, 'bin', 'syncthing'
  );
  var SYNCTHING_CONFIG = path.join(
    core.deps.lookup('config').sysConfRoot, 'syncthing'
  );
  return new Promise(function(fulfill, reject) {
    // @todo: this needs to be made A LOT better
    spawn(SYNCTHING_EXECUTABLE, ['-home', SYNCTHING_CONFIG], {
      stdio: 'ignore', // piping all stdio to /dev/null
      detached: true
    }).unref();
    fulfill(true);
  })
  .then(function() {
    return self.wait();
  });
};

module.exports = Sync;
