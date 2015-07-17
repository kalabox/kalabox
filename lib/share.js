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
  // Return the data containres data volume.
  .then(function(data) {
    var codeDir = '/' + core.deps.lookup('globalConfig').codeDir;
    return data.Volumes[codeDir];
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
 * Restart the sync instances.
 */
// @todo: bcauldwell - Maybe cb and retries should swap places?
var restart = exports.restart = function(cb, retries) {

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
        fs.openSync(path.join(codeRoot, '.stfolder'), 'a');
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

};
