'use strict';

module.exports = function(kbox) {

  // Native modules
  var fs = require('fs');
  var path = require('path');

  // Npm modules
  var _ = require('lodash');
  var sha1 = require('sha1');

  // Sync modules
  var Sync = require('./share/sync.js')(kbox);
  var container = require('./share/syncContainer.js')(kbox);

  // Kalabox modules
  var engine = kbox.engine;
  var app = kbox.app;
  var Promise = kbox.Promise;

  /*
   * Given an app return true if the app has any containers running.
   */
  /*var isAppActive = function(app) {

    // First check to see if this app is the currently
    // registered app and return that regardless
    // NOTE: We do this for the case where we are trying to
    // set up an app for the first time before any of its
    // containers are on or off
    if (_.get(app.config.sharing, 'firstTime', false)) {
      return true;
    }

    // Otherwise get a list of app's containers.
    return engine.list(app.name)
    // Map container to container's is running value.
    .map(function(container) {
      return engine.inspect(container)
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

  };*/

  /*
   * Returns a function that maps app name to number of minutes since that
   * app was stopped.
   */
  /*var minutesSinceAppStoppedMap = function() {

    // Get current time stamp.
    var now = moment();

    // Get list of containers.
    return engine.list()
    // Filter out non app and data containers.
    .filter(function(container) {
      var name = kbox.util.docker.containerName.parse(container.name);
      return name.kind === 'app';
    })
    // Reduce list of containers to an object that maps app name to minutes
    // since last time the app was stopped.
    .reduce(function(result, container) {
      // Parse container name.
      var name = kbox.util.docker.containerName.parse(container.name);
      // Get app name.
      var app = name.app;
      // Inspect the container.
      return engine.inspect(container)
      .then(function(data) {
        // Get the number of minutes since the container stopped, or if the
        // container is still running just return 0.
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
      })
      // Ignore errors.
      .catch(function() {
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

  };*/

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

  /*a
   * Get list of active volumes.
   */
  var getVolumes = function() {

    // Get list of data app.
    return app.list()
    // Map list to volume objects.
    .map(function(app) {
      if (app.name) {
        return {app: app.name};
      } else {
        return null;
      }
    })
    // Filter out nulls.
    .filter(_.identity);

  };

  /*
   * Get local sync instance.
   */
  var getLocalSync = function() {
    return Promise.resolve(new Sync('127.0.0.1'));
  };

  /*
   * Get remote sync instance.
   */
  var getRemoteSync = function() {
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
        codeRootMap[app.name] = app.config.sharing.codeRoot;
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
          return container.start();
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
   * Restart the sync instances.
   */
  var restart = function() {

    // Get list of volumes.
    var volumes = getVolumes();

    // Get a mapping function of app to code root.
    var codeRootMap = getCodeRootMap();

    // Get a started instance of the local syncthing.
    var localSync = getStartedLocalSync();

    // Get a started instance of the remote syncthing.
    var remoteSync = getStartedRemoteSync();

    // Build list of dependencies.
    return Promise.all([volumes, codeRootMap, localSync, remoteSync])
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
        var lNeeds = !self.localSync.hasFolder(self.localConfig, volume.app);
        var rNeeds = !self.remoteSync.hasFolder(self.remoteConfig, volume.app);
        return lNeeds || rNeeds;
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
        self.remoteSync.addFolder(self.remoteConfig, app, '/code/' + app);
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

      // Default rescan interval.
      var defaultRescanInterval = 3;

      // Update local folders.
      _.each(self.localConfig.folders, function(folder) {
        folder.rescanIntervalS = defaultRescanInterval;
      });

      // Update remote folder.
      _.each(self.remoteConfig.folders, function(folder) {
        folder.rescanIntervalS = defaultRescanInterval;
      });

      // Get mapping function for app name -> minutes since app stopped.
      /*return minutesSinceAppStoppedMap()
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

      });*/

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
        });
      }

    });

  };

  // Return stuff
  return {
    getLocalSync: getLocalSync,
    getRemoteSync: getRemoteSync,
    restart: restart
  };

};
