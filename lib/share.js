'use strict';

var engine = require('./engine.js');
var _ = require('lodash');
var Sync = require('./share/sync/sync.js');
var core = require('./core.js');
var Promise = require('bluebird');
var container = require('./share/sync/syncContainer.js');
var async = require('async');
var app = require('./app.js');

var CONTAINER_NAME = 'kalabox_syncthing';

var logDebug = core.log.debug;

var logInfo = core.log.info;

/*
 * Given an app return true if the app has any containers running.
 */
var isAppRunning = function(appName) {

  // Get list of app's containers.
  return new Promise(function(fulfill, reject) {
    engine.list(appName, function(err, containers) {
      if (err) {
        return reject(err);
      }
      fulfill(containers);
    });
  })
  // Map container to container's is running value.
  .map(function(container) {
    return new Promise(function(fulfill, reject) {
      engine.inspect(container.name, function(err, data) {
        if (err) {
          return reject(err);
        }
        fulfill(data.State.Running);
      });
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
  return new Promise(function(fulfill, reject) {
    engine.list(function(err, containers) {
      if (err) {
        return reject(err);
      }
      fulfill(containers);
    });
  })
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
  // Wait until all results are in.
  .all()
  // Return.
  .then(function(dataContainers) {
    logDebug('SHARE => Data containers with an app running.', dataContainers);
    return dataContainers;
  });

};

/*
 * Get the data container volume path.
 */
var getDataContainerVolume = function(dataContainer) {

  return new Promise(function(fulfill, reject) {
    engine.inspect(dataContainer.name, function(err, data) {
      if (err) {
        return reject(err);
      }
      var codeDir = '/' + core.deps.lookup('globalConfig').codeDir;
      if (data.Volumes[codeDir]) {
        fulfill(data.Volumes[codeDir]);
      } else {
        fulfill(null);
      }
    });
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
  .filter(_.negate(_.isNull));

};

/*
 * Get local sync instance.
 */
var getLocalSync = exports.getLocalSync = function() {
  return new Promise(function(fulfill) {
    fulfill(new Sync('127.0.0.1'));
  });
};

/*
 * Get remote sync instance.
 */
var getRemoteSync = exports.getRemoteSync = function() {
  return new Promise(function(fulfill, reject) {
    // Get ip of VM.
    engine.provider.engineConfig(function(err, engineConfig) {
      if (err) {
        return reject(err);
      }
      fulfill(new Sync(engineConfig.host));
    });
  });
};

/*
 * Get a map function of app names to code roots.
 */
var getCodeRootMap = function() {

  return new Promise(function(fulfill, reject) {

    // Get list of apps.
    app.list(function(err, apps) {

      // Report errors.
      if (err) {
        return reject(err);
      }

      // Build map of app name to code root.
      var map = {};
      _.each(apps, function(app) {
        map[app.name] = app.config.codeRoot;
      });

      // Build map function.
      var fn = function(name) {
        if (!map[name]) {
          throw new Error('App code root not found: ' + name);
        }
        return map[name];
      };

      // Return.
      fulfill(fn);

    });

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
 * Restart the sync instances.
 */
var restart = exports.restart = function(cb, retries) {

  // Defaults.
  if (!retries) {
    retries = 2;
  }

  // Have we tried enough times.
  if (retries < 0) {
    return cb(new Error('Could not establish syncthing connections.'));
  }

  // Get volumes.
  var volumes = getVolumes();

  // Get local sync instance.
  var localSync = getLocalSync()
    .then(function(localSync) {
      // Check if sync is running.
      return localSync.isUp()
      .then(function(isUp) {
        if (isUp) {
          // If sync is running, clear it and then shut it down.
          return localSync.clear()
          .then(function() {
            return localSync.shutdown()
            // Wait for 5 seconds after shutting down.
            .delay(5 * 1000);
          });
        }
      })
      // Return reference to local sync instance.
      .then(function() {
        return localSync;
      });
    });

  // Get remote sync instance.
  var remoteSync = getRemoteSync()
    .then(function(remoteSync) {
      // Stop sync container.
      return stopContainer()
      // Return reference to remote sync instance.
      .then(function() {
        return remoteSync;
      });
    });

  // Get a map between app names and app code roots.
  var codeRootMap = getCodeRootMap();

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
      _.each(volumes, function(volume) {
        var app = volume.app;
        var codeRoot = codeRootMap(app);
        localSync.addFolder(localConfig, app, codeRoot);
        remoteSync.addFolder(remoteConfig, app, '/' + app);
      });

      return Promise.all([
        localConfig,
        remoteConfig
      ]);

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

      return new Promise(function(fulfill, reject) {

        var count = 30;

        // Loop.
        async.forever(function(next) {

          // Have we tried enough times?
          count -= 1;
          if (count < 0) {
            // Try the entire restart process over again.
            return restart(cb, retries - 1);
          }

          // Query local sync for connection data.
          localSync.connections()
          .then(function(data) {

            // Success!
            if (_.keys(data.connections).length > 0) {
              return fulfill();
            }
            // Wait and try again.
            setTimeout(function() {
              next();
            }, 1 * 1000);

          })
          .catch(next);

        }, reject);

      });

    })
    // Return.
    .return();

  })
  .nodeify(cb);

};
