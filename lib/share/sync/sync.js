'use strict';

var fs = require('fs');
var path = require('path');
var rest = require('./syncRest.js');
var Promise = require('bluebird');
var _ = require('lodash');
var core = require('../../core.js');
var app = require('../../app.js');
var spawn = require('child_process').spawn;

/*
 * Logging function.
 */
var logDebug = core.log.debug;

/*
 * Constants.
 */
var PORT = 60008;
var NUM_COPIERS = 3;
var NUM_PULLERS = 25;
var NUM_HASHERS = 0;
var RESCAN_INTERVAL = 2;

/*
 * Constructor.
 */
function Sync(ip) {
  this.ip = ip;
  this.address = ['http://', ip, ':', PORT].join('');
}

/*
 * Get the syncthing instance's config.
 */
Sync.prototype.getConfig = function() {
  return rest.config(this.address);
};

/*
 * Set the syncthing instance's config.
 */
Sync.prototype.setConfig = function(config) {
  var self = this;
  // Log new config value.
  logDebug('SYNC => SET CONFIG ' + self.address, config);
  // Set the config.
  return rest.configPost(this.address, config)
  // Get the config that was just set.
  .then(function() {
    return self.getConfig();
  })
  // Log the config that was just set.
  .then(function(configOut) {
    logDebug('SYNC => SET CONFIG CHECK ' + self.address, configOut);
  });
};

/*
 * Get the syncthing instance's device ID.
 */
Sync.prototype.getDeviceId = function() {
  // Get system info.
  return rest.system(this.address)
  // Return just the device ID from system info.
  .then(function(systemInfo) {
    return systemInfo.myID;
  });
};

/*
 * Add a hint to syncthing instance.
 */
Sync.prototype.hint = function(deviceId) {
  return rest.hint(this.address, deviceId);
};

/*
 * Ping the syncthing instance.
 */
Sync.prototype.ping = function() {
  var self = this;
  logDebug('SYNC => PING ' + self.address);
  return rest.ping(self.address);
};

/*
 * Ping the syncthing instance using an older version of the API.
 */
Sync.prototype.pingVersion10 = function() {
  logDebug('SYNC => PING ' + this.address);
  return rest.pingVersion10(this.address);
};

/*
 * Get list of syncthing instance's connections.
 */
Sync.prototype.connections = function() {
  logDebug('SYNC => CONNECTIONS ' + this.address);
  return rest.connections(this.address);
};

/*
 * Ping the syncthing instance until it responds or a timeout occurs.
 */
Sync.prototype.wait = function(counter) {

  // Save for later.
  var self = this;

  // Default counter.
  var DEFAULT_COUNTER = 60;

  // Use default counter.
  if (counter === undefined) {
    counter = DEFAULT_COUNTER;
  }

  // Ping syncthing instance.
  return self.ping()
  // Handle error.
  .catch(function(err) {
    if (counter > 0) {
      // Only retry if there are tries left and we have a connection
      // refused or reset error.
      var expectedErrors = ['ECONNREFUSED', 'ECONNRESET'];
      var isExpectedError = _.any(expectedErrors, function(msg) {
        return _.contains(err.message, msg);
      });
      if (isExpectedError) {
        // Try again after waiting 2 seconds.
        return Promise.delay(2 * 1000)
        .then(function() {
          return self.wait(counter - 1);
        });
      } else {
        // This is not the connection refused error you are looking for.
        throw err;
      }
    } else {
      // We are out of tries so throw an error.
      throw new Error('SYNC => Connecting to ' + self.address +
        ' timed out after ' + DEFAULT_COUNTER + ' tries.');
    }
  });

};

/*
 * Add a remote syncthing instance to this syncthing instance.
 */
Sync.prototype.addDevice = function(config, deviceId, deviceIp) {

  // Save for later.
  var self = this;

  // List of ip addresses a host instance might have.
  var possibleHostIps = ['127.0.0.1', '0.0.0.0'];

  // Check if this instance's ip address is a host ip.
  var isHostInstance = _.any(possibleHostIps, function(ip) {
    return self.ip === ip;
  });

  // IP to use depends on if this is a host instance.
  var ip = isHostInstance ? deviceIp : 'dynamic';

  // Build new device object.
  var newDevice = {
    deviceID: deviceId,
    name: deviceId,
    addresses: [ip],
    compression: 'metadata',
    certName: '',
    introducer: false
  };

  // Filter out any devices that already exist with new device's ID.
  config.devices = _.filter(config.devices, function(device) {
    return device.deviceID !== newDevice.deviceID;
  });

  // Add new device to config's list of devices.
  config.devices.push(newDevice);

  // Return altered config.
  return config;

};

/*
 * Reset the list of devices and folders for this syncthing instance.
 */
Sync.prototype.clear = function() {

  // Save for later.
  var self = this;

  // Get syncthing instance's config.
  return self.getConfig()
  // Set list of devices and list of folders to an empty list.
  .then(function(config) {
    config.devices = [];
    config.folders = [];
    return config;
  })
  // Update syncthing instance's config.
  .then(function(config) {
    return self.setConfig(config);
  });

};

Sync.prototype.addFolder = function(config, id, path) {

  // Map list of devices to a list of folder devices.
  var folderDevices = _.map(config.devices, function(device) {
    return {deviceID: device.deviceID};
  });

  // Build new folder object.
  var newFolder = {
    id: id,
    path: path,
    devices: folderDevices,
    readOnly: false,
    rescanIntervalS: RESCAN_INTERVAL,
    ignorePerms: true,
    versioning: {
      type: '',
      params: {}
    },
    lenientMtimes: false,
    copiers: NUM_COPIERS,
    pullers: NUM_PULLERS,
    hashers: NUM_HASHERS,
    invalid: ''
  };

  // Filter out any current folders with this folder's ID.
  config.folders = _.filter(config.folders, function(folder) {
    return folder.id !== newFolder.id;
  });

  // Add new folder to config's list of folders.
  config.folders.push(newFolder);

  // Return altered config.
  return config;

};

Sync.prototype.__isUpInternal = function(pingFunc) {

  // Ping synching instance.
  return this[pingFunc]()
  // If ping was successful, we know it's up so return true.
  .then(function(data) {
    return true;
  })
  // Either syncthing instance is down or an error has occurred.
  .catch(function(err) {
    if (_.contains(err.message, 'ECONNREFUSED')) {
      // Error tells us syncthing instance is down so return false.
      return false;
    } else {
      // Unexpected error, throw it.
      throw err;
    }
  });

};

/*
 * Send a ping to a syncthing instance to find out if it's up.
 */
Sync.prototype.isUp = function() {
  return this.__isUpInternal('ping');
};

/*
 * Send a legacy ping to a syncthing instance to find out if it's up.
 */
Sync.prototype.isUpVersion10 = function() {
  return this.__isUpInternal('pingVersion10');
};

/*
 * Restart syncthing instance.
 */
Sync.prototype.restart = function() {

  // Save for later.
  var self = this;

  // Log start.
  logDebug('SYNC => attemping restart: ' + self.address);

  // Restart syncthing instance.
  return rest.restart(self.address)
  // Log successful restarting.
  .then(function() {
    logDebug('SYNC => restarting: ' + self.address);
  });

};

/*
 * Restart syncthing instance then wait until it becomes responsive.
 */
Sync.prototype.restartWait = function() {

  // Save for later.
  var self = this;

  // Log start.
  logDebug('SYNC => waiting for restart to finish: ' + self.address);

  // Restart syncthing instance.
  return self.restart()
  // Wait until it becomes responsive.
  .then(function() {
    return self.wait();
  })
  // Log successful restarting.
  .then(function() {
    logDebug('SYNC => done restarting: ' + self.address);
  });

};

/*
 * Internal reuse function for shutting down syncthing instance.
 */
Sync.prototype.__shutdownInternal = function(shutdownFunc) {

  // Save for later.
  var self = this;

  // Log start.
  logDebug('SYNC => attempting shutdown: ' + self.address);

  // Shutdown syncthing instance.
  return shutdownFunc(self.address)
  // Log successfull shutdown.
  .then(function() {
    logDebug('SYNC => shutdown: ' + self.address);
  });

};

/*
 * Shutdown syncthing instance.
 */
Sync.prototype.shutdown = function() {
  return this.__shutdownInternal(rest.shutdown);
};

/*
 * Shutdown lecacy syncthing instance.
 */
Sync.prototype.shutdownVersion10 = function() {
  return this.__shutdownInternal(rest.shutdownVersion10);
};

/*
 * Start local syncthing instance and then wait for it to become responsive.
 */
Sync.prototype.start = function() {

  // Save for later.
  var self = this;

  // Get global config.
  var globalConfig = core.deps.lookup('config');

  // Check if we are on windows.
  var isWindows = process.platform === 'win32';

  // Get binary name depending on if we are on windows or not.
  var binaryName = isWindows ? 'syncthing.exe' : 'syncthing';

  // Build path to syncthing binary.
  var binaryPath = path.join(globalConfig.sysConfRoot, 'bin', binaryName);

  // Build path to syncthing config.
  var configPath = path.join(globalConfig.sysConfRoot, 'syncthing');

  // Path to where the output logs for syncthing will be written.
  var logPath = globalConfig.logRoot;

  // Ignore stdin for child process.
  var stdin = 'ignore';

  // Write stdout for child process to a new log file.
  var stdout = fs.openSync(path.join(logPath, 'syncthing-stdout.log'), 'w');

  // Write stderr for child process to a new log file.
  var stderr = fs.openSync(path.join(logPath, 'syncthing-stderr.log'), 'w');

  // Build options object for child process.
  // NOTE: Because the child process is detached, there will be no feedback so
  // the stdout and stderr logs are very important for troubleshooting.
  var opts = {
    stdio: [stdin, stdout, stderr],
    detached: true
  };

  // Spawn a new detached child process.
  return Promise.try(function() {
    return spawn(binaryPath, ['-home', configPath], opts).unref();
  })
  // Wait for syncthing instance to become responsive.
  .then(function() {
    return self.wait();
  });

};

// Return constructor as module.
module.exports = Sync;
