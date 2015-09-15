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
var kbox = require('./kbox.js');
var moment = require('moment');
var assert = require('assert');

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
 * Returns a function that maps app name to number of minutes since that
 * app was stopped.
 */
var minutesSinceAppStoppedMap = function() {

  // Get current time stamp.
  var now = moment();

  // Get list of containers.
  return engine.list()
  // Filter out non app and data containers.
  .filter(function(container) {
    var name = kbox.util.docker.containerName.parse(container.name);
    return name.kind === 'app' && name.name !== 'data';
  })
  // Reduce list of containers to an object that maps app name to minutes
  // since last time the app was stopped.
  .reduce(function(result, container) {
    // Parse container name.
    var name = kbox.util.docker.containerName.parse(container.name);
    // Get app name.
    var app = name.app;
    // Inspect the container.
    return engine.inspect(container.name)
    .then(function(data) {
      /*
       * Get the number of minutes since the container stopped, or if the
       * container is still running just return 0.
       */
      var sinceMinutes = data.State.Running ?
        0 :
        moment(data.State.FinishedAt).diff(now, 'minutes');
      if (!result[app]) {
        // First time a container for this app is encountered, so just init.
        result[app] = sinceMinutes;
      } else {
        // Only use current containers since minutes if it's greater than what
        // we already have.
        result[app] = _.max([
          result[app],
          sinceMinutes
        ]);
      }
      return result;
    });
  }, {})
  // Log mapped object.
  .tap(function(mapped) {
    logDebug('SHARE => minutesSinceAppStopped.', mapped);
  })
  // Build a function to map the app name to since minutes.
  .then(function(mapped) {
    return function(app) {
      if (mapped[app] === undefined) {
        return Infinity;
      } else {
        return mapped[app];
      }
    };
  });

};

/*
 * Get a unique list of installed apps.
 */
var getApps = function() {

  // Get list of containers.
  return engine.list()
  // Map container to app name.
  .map(function(container) {
    var name = kbox.util.docker.containerName.parse(container.name);
    return name.kind === 'app' ? name.app : null;
  })
  // Filter out those that didn't have an app name.
  .filter(_.identity)
  // Remove duplicates from list.
  .then(_.uniq);

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
    }
  })
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
  // Return the data containres data volume.
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
  // Remove folders we don't need anymore.
  .then(function() {

    var self = this;

    // Get list of apps.
    return getApps()
    // Remove those folders not in the list of app names.
    .then(function(appNames) {

      // Get list of folders that no longer have an installed app.
      var foldersToRemove = _.filter(self.localConfig.folders,
      function(folder) {
        return !_.contains(appNames, folder.id);
      });
      foldersToRemove = _.map(foldersToRemove, function(folder) {
        return folder.id;
      });

      // Remove folders from local instance.
      self.localConfig.folders =
        _.filter(self.localConfig.folders, function(folder) {
          return !_.contains(foldersToRemove, folder.id);
        });

      // Remove folders from remote instance.
      self.remoteConfig.folders =
        _.filter(self.remoteConfig.folders, function(folder) {
          return !_.contains(foldersToRemove, folder.id);
        });

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
      // Make sure the syncthing folder identified exists.
      return Promise.fromNode(function(cb) {
        var filepath = path.join(codeRoot, '.stfolder');
        fs.open(filepath, 'w+', cb);
      });
    });

  })
  // Update folder rescan intervals.
  .then(function() {

    var self = this;

    // Get mapping function for app name -> minutes since app stopped.
    return minutesSinceAppStoppedMap()
    .then(function(map) {

      // Interpolate minutes since app stopped to a rescan interval in seconds.
      function getRescanInterval(app) {
        var minutesSinceStopped = map(app);
        if (minutesSinceStopped < -60) {
          return 60 * 60; // 60 minutes
        } else if (minutesSinceStopped < -15) {
          return 60 * 5; // 5 minutes
        } else if (minutesSinceStopped < -5) {
          return 15; // 15 seconds
        } else {
          return 2; // 2 seconds
        }
      }

      // Update local folders.
      _.each(self.localConfig.folders, function(folder) {
        folder.rescanIntervalS = getRescanInterval(folder.id);
      });

      // Update remote folder.
      _.each(self.remoteConfig.folders, function(folder) {
        folder.rescanIntervalS = getRescanInterval(folder.id);
      });

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

/*
 * Restart the sync instances.
 */
// @todo: bcauldwell - Maybe cb and retries should swap places?
/*var restart_old = exports.restart_old = function(cb, retries) {

  throw new Error('F!');

  // Defaults.
  if (!retries) {
    retries = 2;
  }

  // Have we tried enough times.
  // @todo: bcauldwell - This needs to be moved inside of a promise to have
  // this workflow be 100% correct.
  if (retries < 0) {
    return cb(new Error('Could not establish syncthing connections.'));
  }

  // Get local sync instance.
  var localSync = getLocalSync()
    .then(function(localSync) {
      // Check if sync is running.
      return localSync.isUp()
      .then(function(isUp) {
        if (isUp) {
          // If sync is running, clear it and then shut it down.
          return localSync.clear();
        }
      })
      // Return reference to local sync instance.
      .return(localSync);
    });

  // Get remote sync instance.
  var remoteSync =
    localSync
    .then(function() {
      return getRemoteSync();
    })
    .then(function(remoteSync) {
      // Stop sync container.
      return stopContainer(remoteSync)
      // Return reference to remote sync instance.
      .return(remoteSync);
    });

  // Get a map between app names and app code roots.
  var codeRootMap = Promise.all([localSync, remoteSync])
    .then(function() {
      return getCodeRootMap();
    });
  //var codeRootMap = getCodeRootMap();

  // Get volumes.
  var volumes = Promise.all([localSync, remoteSync])
    .then(function() {
      return getVolumes();
    });
  //var volumes = getVolumes();

  // Wait for previous promises to finish.
  Promise.all([volumes, localSync, remoteSync, codeRootMap])
  .spread(function(volumes, localSync, remoteSync, codeRootMap) {

    // Start local sync instance.
    var startLocal = localSync.start();

    // Start remote sync instance.
    var startRemote = createContainer(volumes)
      .then(function() {
        return startContainer()
        .then(function() {
          return remoteSync.wait();
        });
      });

    // Get configs and deviceIds for sync instances.
    return Promise.all([startLocal, startRemote])
    .then(function() {

      return Promise.all([
        localSync.getConfig(),
        localSync.getDeviceId(),
        remoteSync.getConfig(),
        remoteSync.getDeviceId()
      ]);

    })
    // Edit configs.
    .spread(function(localConfig, localId, remoteConfig, remoteId) {

      // Add devices to configs.
      localSync.addDevice(localConfig, remoteId, remoteSync.ip);
      remoteSync.addDevice(remoteConfig, localId, localSync.ip);

      // Add each volume to configs.
      return Promise.each(volumes, function(volume) {
        var app = volume.app;
        var codeRoot = codeRootMap(app);
        localSync.addFolder(localConfig, app, codeRoot);
        remoteSync.addFolder(remoteConfig, app, '/' + app);

        // Ensure folder marker exists.
        if (fs.existsSync(codeRoot)) {
          return Promise.fromNode(function(cb) {
            fs.open(path.join(codeRoot, '.stfolder'), 'a', cb);
          });
        }
      })
      .then(function() {
        return Promise.each(volumes, function(volume) {
          var app = volume.app;
          var codeRoot = codeRootMap(app);
          var filepath = path.join('/' + app, '.stfolder');
          var cmd = [
            'touch',
            filepath
          ];
          return engine.query('kalabox_syncthing', cmd);
        })
      })
      .then(function() {
        return Promise.all([
          localConfig,
          remoteConfig
        ]);
      });

    })
    // Set configs.
    .spread(function(localConfig, remoteConfig) {

      return Promise.all([
        localSync.setConfig(localConfig),
        remoteSync.setConfig(remoteConfig)
      ]);

    })
    // Restart sync instances.
    .then(function() {

      return Promise.all([
        localSync.restartWait(),
        remoteSync.restartWait()
      ]);

    })
    // Make sure local and remote instances are connected.
    .then(function() {

      // Recursive function for checking connection state.
      var rec = function(counter) {

        // Query local syncthing instance's connections info.
        return localSync.connections()
        // Check connection state and retry a reasonable amount of times.
        // @todo: @bcauldwell - This needs to be done much better, perhaps
        // abstract out the syncRest.js requestWrapper algo and use it here.
        .then(function(data) {
          // Not in a good state.
          if (_.keys(data.connections).length === 0) {
            if (counter > 0) {
              // Wait 1 seconds then try again.
              return Promise.delay(1 * 1000)
              .then(function() {
                return rec(counter - 1);
              });
            } else {
              // Try entire restart again.
              return restart(cb, retries - 1);
            }
          }
        });

      };

      // Init recursive function with 15 tries.
      return rec(30);

    });

  })
  // Return.
  .nodeify(cb);

};*/
