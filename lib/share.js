'use strict';

var engine = require('./engine.js');
var _ = require('lodash');
var Sync = require('./share/sync/sync.js');
var core = require('./core.js');
var Promise = require('./promise.js');
var container = require('./share/sync/syncContainer.js');
var async = require('async');
var app = require('./app.js');
var fs = require('fs');
var path = require('path');
var sha1 = require('sha1');

var CONTAINER_NAME = 'kalabox_syncthing';

var logDebug = core.log.debug;

var logInfo = core.log.info;

/*
 * Given an app return true if the app has any containers running.
 */
var isAppRunning = function(appName) {

  // Get list of app's containers.
  return engine.list(appName)
  // Map container to container's is running value.
  .map(function(container) {
    return engine.inspect(container.name)
    .then(function(data) {
      return data.State.Running;
    });
  }, {concurrency: 5})
  // Filter out falses.
  .filter(_.identity)
  // Sum trues.
  .reduce(function(count) {
    return count + 1;
  }, 0)
  // Return true if sum of trues is greater than zero.
  .then(function(count) {
    return count > 0;
  });

};

/*
 * Get list of data containers that are part of apps that are running.
 */
var getDataContainers = function() {

  // Get list of all installed containers.
  return engine.list(null)
  // Filter out non data containers, and containers that are part of
  // apps that are not running.
  .filter(function(container) {
    var parts = container.name.split('_');
    var isDataContainer =
      parts.length === 3 &&
      parts[0] === 'kb' &&
      parts[2] === 'data';
    if (!isDataContainer) {
      return false;
    } else {
      return isAppRunning(parts[1]);
      //return true;
    }
  })
  // Wait until all results are in.
  .all()
  // Return.
  .tap(function(dataContainers) {
    logDebug('SHARE => Data containers with an app running.', dataContainers);
  });

};

/*
 * Get the data container volume path.
 */
var getDataContainerVolume = function(dataContainer) {

  // Inspect data container.
  return engine.inspect(dataContainer.name)
  // Return the data containers data volume.
  .then(function(data) {
    var codeDir = '/' + core.deps.lookup('globalConfig').codeDir;
    /*
     * Starting in remote api 1.8 the volume data shows up in data->Mounts,
     * rather than data->Volumes. We need to be able to handle both here.
     */
    if (data.Mounts) {
      return _.result(_.find(data.Mounts, function(mount) {
        return mount.Destination === codeDir;
      }), 'Source');
    } else {
      return data.Volumes[codeDir];
    }
  });

};

/*
 * Get list of volumes.
 */
var getVolumes = function() {

  // Get list of data containers.
  return getDataContainers()
  // Map list to volume objects.
  .map(function(dataContainer) {
    return getDataContainerVolume(dataContainer)
    .then(function(volume) {
      if (volume) {
        return {app: dataContainer.app, volume: volume};
      } else {
        return null;
      }
    });
  })
  // Filter out nulls.
  .filter(_.identity);

};

/*
 * Get local sync instance.
 */
var getLocalSync = exports.getLocalSync = function() {
  return Promise.resolve(new Sync('127.0.0.1'));
};

/*
 * Get remote sync instance.
 */
var getRemoteSync = exports.getRemoteSync = function() {
  // Get provider's engine config.
  return engine.provider().call('engineConfig')
  // Return syncthing instance with engine config's host IP.
  .then(function(engineConfig) {
    return new Sync(engineConfig.host);
  });
};

/*
 * Get a map function of app names to code roots.
 */
var getCodeRootMap = function() {

  // Get list of apps.
  return app.list()
  // Return a function that maps an app name to a code root.
  .then(function(apps) {

    // Build map of app name to code root.
    var codeRootMap = {};
    _.each(apps, function(app) {
      codeRootMap[app.name] = app.config.codeRoot;
    });

    // Build map function.
    var fn = function(name) {
      if (!codeRootMap[name]) {
        throw new Error('App code root not found: ' + name);
      }
      return codeRootMap[name];
    };

    // Return map function.
    return fn;

  });

};

/*
 * Stop the remote sync container.
 */
var stopContainer = function(remoteSync) {

  // Check if container is installed.
  return container.isInstalled()
  .then(function(isInstalled) {
    if (isInstalled) {
      // Check if container is running.
      return container.isRunning()
      .then(function(isRunning) {
        if (isRunning) {
          // Stop container.
          return container.stop();
        }
      })
      .then(function() {
        // Remove the container.
        return container.remove();
      });
    }
  });

};

/*
 * Create the remote sync container.
 */
var createContainer = function(volumes) {
  var binds = _.map(volumes, function(x) {
    return [x.volume, '/' + x.app].join(':');
  });
  return container.create(binds);
};

/*
 * Start the remote sync container.
 */
var startContainer = function() {
  return container.start();
};

/*
 * Get a started instance of the local syncthing.
 */
var getStartedLocalSync = function() {

  // Get local syncthing.
  return getLocalSync()
  .then(function(localSync) {
    return localSync.isUp()
    .then(function(isUp) {
      // Start if it is not running.
      if (!isUp) {
        return localSync.start()
        .then(function() {
          return localSync.wait();
        });
      }
    })
    .then(function() {
      return localSync;
    });
  });

};

var getRemoteSyncIfStarted = function() {

  return getRemoteSync()
  .then(function(remoteSync) {
    return remoteSync.isUp()
    .then(function(isUp) {
      if (isUp) {
        return remoteSync;
      }
    });
  });

};

/*
 * Get a started instance of the remote syncthing.
 */
var getStartedRemoteSync = function() {

  // Get remote syncthing.
  return getRemoteSync()
  .then(function(remoteSync) {
    return container.isInstalled()
    .then(function(isInstalled) {
      // Install if it is not already installed.
      if (!isInstalled) {
        return container.create();
      }
    })
    .then(function() {
      return remoteSync.isUp();
    })
    .then(function(isUp) {
      if (!isUp) {
        // Start if it is not already running.
        return startContainer()
        .then(function() {
          return remoteSync.wait();
        });
      }
    })
    .then(function() {
      return remoteSync;
    });
  });

};

/*
 * Clear folders when kalabox goes down.
 */
core.events.on('pre-down', function(done) {

  getRemoteSyncIfStarted()
  .then(function(remoteSync) {
    if (remoteSync) {
      return remoteSync.clear()
      .then(function() {
        return remoteSync.shutdown();
      });
    }
  })
  .nodeify(done);

});

/*
 * Clear app folder when the app is uninstalled.
 */
core.events.on('pre-uninstall', function(app, done) {

  getStartedRemoteSync()
  .then(function(remoteSync) {
    return remoteSync.clearFolder(app.name)
    .then(function() {
      return remoteSync.restartWait();
    });
  })
  .nodeify(done);

});

/*
 * Restart the sync instances.
 */
var restart = exports.restart = function(cb) {

  // Get list of volumes.
  var volumes = getVolumes();

  // Get a mapping function of app to code root.
  var codeRootMap = getCodeRootMap();

  // Get a started instance of the local syncthing.
  var localSync = getStartedLocalSync();

  // Get a started instance of the remote syncthing.
  var remoteSync = getStartedRemoteSync();

  // Build list of dependencies.
  Promise.all([volumes, codeRootMap, localSync, remoteSync])
  .bind({})
  .spread(function(volumes, codeRootMap, localSync, remoteSync) {

    var self = this;
    self.volumes = volumes;
    self.codeRootMap = codeRootMap;
    self.localSync = localSync;
    self.remoteSync = remoteSync;

    return Promise.all([
      localSync.getConfig(),
      localSync.getDeviceId(),
      remoteSync.getConfig(),
      remoteSync.getDeviceId()
    ])
    .spread(function(localConfig, localId, remoteConfig, remoteId) {
      self.localConfig = localConfig;
      self.localConfigHash = sha1(JSON.stringify(localConfig));
      self.localId = localId;
      self.remoteConfig = remoteConfig;
      self.remoteConfigHash = sha1(JSON.stringify(remoteConfig));
      self.remoteId = remoteId;
    });

  })
  // Filter out folders with the wrong codeRoot.
  .then(function() {

    var self = this;

    var foldersToRemove = _.chain(self.localConfig.folders)
      .filter(function(folder) {
        var codeRoot = self.codeRootMap(folder.id);
        return folder.path !== codeRoot;
      })
      .map(function(folder) {
        return folder.id;
      });

    self.localConfig.folders =
      _.filter(self.localConfig.folders, function(folder) {
        return !_.contains(foldersToRemove, folder.id);
      });

    self.remoteConfig.folders =
      _.filter(self.remoteConfig.folders, function(folder) {
        return !_.contains(foldersToRemove, folder.id);
      });

  })
  // Get list of volumes that need to be added.
  .then(function() {

    var self = this;

    return Promise.filter(self.volumes, function(volume) {
      var needToAdd = !self.localSync.hasFolder(self.localConfig, volume.app) ||
        !self.remoteSync.hasFolder(self.remoteConfig, volume.app);
      return needToAdd;
    })
    .then(function(volumesToAdd) {
      self.volumesToAdd = volumesToAdd;
    });

  })
  // Add devices and folders.
  .then(function() {

    var self = this;

    // Add devices.
    if (self.volumesToAdd.length > 0) {
      self.localSync.addDevice(
        self.localConfig, self.remoteId, self.remoteSync.ip
      );
      self.remoteSync.addDevice(
        self.remoteConfig, self.localId, self.localSync.ip
      );
    }

    // Add folders.
    return Promise.each(self.volumesToAdd, function(volume) {
      var app = volume.app;
      var codeRoot = self.codeRootMap(app);
      self.localSync.addFolder(self.localConfig, app, codeRoot);
      self.remoteSync.addFolder(self.remoteConfig, app, '/' + app);
    });

  })
  // Figure out if syncthing needs to be updated.
  .then(function() {

    var self = this;

    var updateLocal =
      self.localConfigHash !== sha1(JSON.stringify(self.localConfig));

    var updateRemote =
      self.remoteConfigHash !== sha1(JSON.stringify(self.remoteConfig));

    self.update = updateLocal || updateRemote;

  })
  // Update and restart syncthing.
  .then(function() {

    var self = this;

    if (self.update) {

      return self.localSync.setConfig(self.localConfig)
      .then(function() {
        return self.remoteSync.setConfig(self.remoteConfig);
      })
      .then(function() {
        return Promise.all([
          self.localSync.restartWait(),
          self.remoteSync.restartWait()
        ]);
      })
      .then(function() {
        return self.remoteSync.shutdown()
        .then(function() {
          return container.stop();
        })
        .then(function() {
          return container.remove();
        })
        .then(function() {
          return createContainer(self.volumes);
        })
        .then(function() {
          return container.start();
        })
        .then(function() {
          return self.remoteSync.wait();
        });
      });

    }

  })
  // Return.
  .nodeify(cb);

};
