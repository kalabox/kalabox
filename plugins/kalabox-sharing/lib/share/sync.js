'use strict';

module.exports = function(kbox) {

  // Native
  var fs = require('fs');
  var path = require('path');
  var spawn = require('child_process').spawn;

  // Npm
  var _ = require('lodash');
  var VError = require('verror');

  // Kalabox
  var rest = require('./syncRest.js')(kbox);
  var Promise = kbox.Promise;
  var core = kbox.core;

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
    // Log ping.
    logDebug('SYNC => PING ' + self.address);
    // Send ping.
    return rest.ping(self.address, {counter: 1})
    // Ping returned so all is good.
    .then(function() {
      return true;
    })
    // Require a response within 5 seconds.
    .timeout(5 * 1000)
    // Map certain response errors to a false return value.
    .catch(function(err) {
      var expectedPhrases = [
        'ECONNREFUSED',
        'ENETUNREACH',
        'operation timed out'
      ];
      var expected = _.reduce(expectedPhrases, function(acc, phrase) {
        return acc || _.contains(err.message, phrase);
      }, false);
      if (expected) {
        // Is an expected error so assume instance is down.
        return false;
      } else {
        // Unexpected error, throw it.
        throw new VError(err,
          'Unexpected error while trying to determine if syncthing %s is up.',
          self.address
        );
      }
    });
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
  Sync.prototype.wait = function(/*counter*/) {

    // Save for later.
    var self = this;

    // Recursive function.
    var rec = function() {
      // Send a ping.
      return self.ping()
      // If no response, then try again after a 3 second delay.
      .then(function(response) {
        if (!response) {
          return Promise.delay(3 * 1000)
          .then(function() {
            return rec();
          });
        }
      });
    };

    // Run recursive function until it returns or a timeout is reached.
    return rec()
    .timeout(30 * 1000)
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err,
        'Unexpected error while waiting for syncthing %s to start.',
        self.address
      );
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
      /*
       * Removing the clearing of devices and folders to fix bug where
       * restarting or starting after a change to a file was causing
       * syncthing conflicts. This needs to be revisited in the near
       * future, but for now is an elegant solution.
       */
      //config.devices = [];
      config.folders = [];
      return config;
    })
    // Update syncthing instance's config.
    .then(function(config) {
      return self.setConfig(config);
    });

  };

  /*
   * Clear folder with a given id.
   */
  Sync.prototype.clearFolder = function(id) {

    // Save for later.
    var self = this;

    // Get syncthing instance's config.
    return self.getConfig()
    // Filter list of folders to remote folder with id of id.
    .then(function(config) {
      config.folders = _.filter(config.folders, function(folder) {
        return folder.id !== id;
      });
      return config;
    })
    // Update syncthing instance's config.
    .then(function(config) {
      return self.setConfig(config);
    });
  };

  /*
   * Returns true if a given folder exists.
   */
  Sync.prototype.hasFolder = function(config, id) {

    return _.contains(config.folder, id);

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
      ignorePerms: false,
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

  /*
   * Send a ping to a syncthing instance to find out if it's up.
   */
  Sync.prototype.isUp = function() {
    // Save reference for later.
    var self = this;
    // Send a ping.
    return self.ping();
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
      return self.wait()
      // If wait failed, then we can assume syncthing failed to restart and is
      // in a stopped state so try to start it again.
      .catch(function() {
        return self.start();
      });
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

    /*
     * @todo: @bcauldwell - We need to have rotating syncthing logs, so they
     * don't get blown away everytime we restart.
     */

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

    // Build command options
    var cOpts = ['-home', configPath];
    // Add in a no console option for windows
    if (isWindows) {
      cOpts.push('-no-console');
    }

    // Spawn a new detached child process.
    return Promise.try(function() {
      return spawn(binaryPath, cOpts, opts).unref();
    })
    // Wait for syncthing instance to become responsive.
    .then(function() {
      return self.wait();
    });

  };

  // Return constructor as module.
  return Sync;

};
