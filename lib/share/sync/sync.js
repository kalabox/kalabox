'use strict';

var path = require('path');
var rest = require('./syncRest.js');
var Promise = require('bluebird');
var _ = require('lodash');
var core = require('../../core.js');
var app = require('../../app.js');
var spawn = require('child_process').spawn;

var logDebug = core.log.debug;

function Sync(ip) {
  this.ip = ip;
  this.address = ['http://', ip, ':60008'].join('');
}

Sync.prototype.getConfig = function() {
  return rest.config(this.address);
};

Sync.prototype.setConfig = function(config) {
  var self = this;
  logDebug('SYNC => SET CONFIG ' + self.address, config);
  return rest.configPost(this.address, config)
  .then(function() {
    return self.getConfig()
    .then(function(configOut) {
      logDebug('SYNC => SET CONFIG CHECK ' + self.address, config);
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
  logDebug('SYNC => PING ' + this.address);
  return rest.ping(this.address);
};

Sync.prototype.pingVersion10 = function() {
  logDebug('SYNC => PING ' + this.address);
  return rest.pingVersion10(this.address);
};

Sync.prototype.wait = function() {
  var self = this;
  var interval = 1 * 1000;
  var attempts = 120;
  return new Promise(function(fulfill, reject) {
    var rec = function(attemptsLeft) {
      self.ping()
      .then(function() {
        fulfill();
      })
      .catch(function(err) {
        if (attemptsLeft === 0) {
          reject(new Error('SYNC => Connecting to ' + self.address +
            ' timed out after ' + attempts + ' tries.'));
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
      var deviceAlreadyExists = _.find(config.devices, function(device) {
        return device.deviceID === deviceId;
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
          deviceID: deviceId,
          name: deviceId,
          addresses: [ip],
          compression: 'metadata',
          certName: '',
          introducer: false
        };
        config.devices.push(device);
      }
      return remoteSync.setConfig(config)
        .then(function() {
          logDebug('SYNC => Linking devices ' +
            deviceId + '<=>' + remoteSync.address);
        });
    });
};

Sync.prototype.clear = function() {
  var self = this;
  return self.getConfig()
    .then(function(config) {
      config.devices = [];
      config.folders = [];
      return self.setConfig(config);
    });
};

Sync.prototype.removeFolder = function(id) {
  var self = this;
  return self.getConfig()
    .then(function(config) {
      logDebug('SYNC => Removing folder ' + id + ' ' + self.address);
      var folders = _.filter(config.folders, function(folder) {
        return folder.id !== id;
      });
      config.folders = folders;
      return self.setConfig(config);
    });
};

Sync.prototype.addFolder = function(id, path, remoteSync, overrideOptions) {
  var self = this;
  logDebug('SYNC => Adding folder ' + id + ' ' + self.address);
  var options = {
    readOnly: false,
    rescanIntervalS: 2,
    ignorePerms: true,
    versioning: {
      type: '',
      params: {}
    },
    lenientMtimes: false,
    copiers: 1,
    pullers: 16,
    hashers: 0,
    invalid: ''
  };
  return Promise.join(
    self.getDeviceId(),
    self.getConfig(),
    remoteSync.getDeviceId(),
    function(deviceId, config, remoteDeviceId) {
      var devices = _.map([deviceId, remoteDeviceId],
        function(x) { return {deviceID: x}; });
      var folder = {
        id: id,
        path: path,
        devices: devices,
        readOnly: false,
        rescanIntervalS: options.rescanIntervalS,
        ignorePerms: options.ignorePerms,
        versioning: options.versioning,
        lenientMtimes: options.lenientMtime,
        copiers: 1,
        pullers: 16,
        hashers: 0,
        invalid: ''
      };
      var folderAlreadyExists = _.find(config.folders,
        function(folder) { return folder.id === id; });
      if (folderAlreadyExists === undefined) {
        config.folders.push(folder);
      } else {
        config.folders[folder.id] = folder;
      }
      return config;
    })
    .then(function(config) {
      return self.setConfig(config);
    })
    .then(function() {
      return logDebug('SYNC => Added folder ' + id + ' ' + self.address);
    });
};

Sync.prototype.shareFolder = function(name, remoteSync) {
  var self = this;
  return new Promise(function(fulfill, reject) {
    app.get(name, function(err, app) {
      if (err) {
        reject(err);
      } else {
        fulfill(app);
      }
    });
  })
  .then(function(app) {
    var localPath = app.config.codeRoot;
    var remotePath = '/' + name;
    return self.addFolder(name, localPath, remoteSync)
    .then(function() {
      return remoteSync.addFolder(name, remotePath, self);
    })
    .then(function() {
      return logDebug('SYNC => Folder shared: ' + JSON.stringify(localPath));
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
      if (_.contains(err.message, 'connect ECONNREFUSED')) {
        return false;
      } else {
        throw err;
      }
    });
};

Sync.prototype.isUpVersion10 = function() {
  var self = this;
  return self.pingVersion10()
    .then(function(data) {
      return true;
    })
    .catch(function(err) {
      if (_.contains(err.message, 'connect ECONNREFUSED')) {
        return false;
      } else {
        throw err;
      }
    });
};

Sync.prototype.restart = function() {
  var self = this;
  logDebug('SYNC => attemping restart: ' + self.address);
  return rest.restart(self.address)
    .then(function() {
      logDebug('SYNC => restarting: ' + self.address);
    });
};

Sync.prototype.restartWait = function() {
  var self = this;
  logDebug('SYNC => waiting for restart to finish: ' + self.address);
  return self.restart()
  .then(function() {
    return self.wait()
    .then(function() {
      logDebug('SYNC => done restarting: ' + self.address);
    });
  });
};

Sync.prototype.shutdown = function() {
  var self = this;
  logDebug('SYNC => attempting shutdown: ' + self.address);
  return rest.shutdown(this.address)
  .then(function() {
    logDebug('SYNC => shutdown: ' + self.address);
  });
};

Sync.prototype.shutdownVersion10 = function() {
  var self = this;
  logDebug('SYNC => attempting shutdown: ' + self.address);
  return rest.shutdownVersion10(this.address)
  .then(function() {
    logDebug('SYNC => shutdown: ' + self.address);
  });
};

Sync.prototype.start = function() {
  var self = this;
  // @todo: this only works for local syncthing for now
  var sE = (process.platform === 'win32') ? 'syncthing.exe' : 'syncthing';
  var SYNCTHING_EXECUTABLE = path.join(
    core.deps.lookup('config').sysConfRoot, 'bin', sE
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
