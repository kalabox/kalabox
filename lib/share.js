'use strict';

var engine = require('./engine.js');
var _ = require('lodash');
var Sync = require('./share/sync/sync.js');
var core = require('./core.js');
var Promise = require('bluebird');
var container = require('./share/sync/syncContainer.js');
var async = require('async');

var CONTAINER_NAME = 'kalabox_syncthing';

var logDebug = core.log.debug;

var logInfo = core.log.info;

var isAppRunning = function(appName) {
  return new Promise(function(fulfill, reject) {
    engine.list(appName, function(err, containers) {
      if (err) {
        reject(err);
      } else {
        async.reduce(containers, false, function(found, container, next) {
          if (!found) {
            engine.inspect(container.name, function(err, data) {
              if (err) {
                next(err);
              } else if (data.State.Running) {
                next(null, true);
              } else {
                next(null, found);
              }
            });
          } else {
            next(null, found);
          }
        },
      function(err, found) {
        if (err) {
          reject(err);
        } else {
          fulfill(found);
        }
      });
      }
    });
  });
};

var getDataContainers = function() {
  return new Promise(function(fulfill, reject) {
    engine.list(function(err, containers) {
      if (err) {
        reject(err);
      } else {
        fulfill(containers);
      }
    });
  })
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
  .then(function(dataContainers) {
    return Promise.all(dataContainers);
  })
  .then(function(dataContainers) {
    logDebug('SHARE => Data containers with an app running.', dataContainers);
    return dataContainers;
  });
};

var getDataContainerVolume = function(dataContainer) {
  return new Promise(function(fulfill, reject) {
    engine.inspect(dataContainer.name, function(err, data) {
      if (err) {
        reject(err);
      } else {
        if (data.Volumes['/data']) {
          fulfill(data.Volumes['/data']);
        } else {
          fulfill(null);
        }
      }
    });
  });
};

var getVolumes = function() {
  return getDataContainers()
  .then(function(dataContainers) {
    var binds = _.map(dataContainers, function(dataContainer) {
      return getDataContainerVolume(dataContainer)
      .then(function(volume) {
        if (volume) {
          return {app: dataContainer.app, volume: volume};
        } else {
          return null;
        }
      });
    });
    return Promise.all(binds)
    .then(function(values) {
      return values.filter(function(value) {
        return (value !== null);
      });
    });
  });
};

var getCurrentShares = function(cb) {
  engine.inspect(CONTAINER_NAME, function(err, data) {
    if (err) {
      cb(err);
    } else {
      cb(null, data.Volumes);
    }
  });
};

var sharesToBinds = function(shares) {
  var binds = [];
  for (var key in shares) {
    binds.push([shares[key], key].join(':'));
  }
  return binds;
};

var getLocalSync = exports.getLocalSync = function() {
  return new Promise(function(fulfill) {
    fulfill(new Sync('127.0.0.1'));
  });
};

var getRemoteSync = exports.getRemoteSync = function() {
  return new Promise(function(fulfill, reject) {
    engine.provider.engineConfig(function(err, engineConfig) {
      if (err) {
        reject(err);
      } else {
        fulfill(new Sync(engineConfig.host));
      }
    });
  });
};

var resetSync = function(sync) {
  return sync.isUp()
  .then(function(isUp) {
    if (isUp) {
      return sync.clear()
      .then(function() {
        return sync.restartWait();
      });
    }
  });
};

var setupSyncs = function(volumes) {
  logDebug('SHARE => Setting up syncs.');

  var startLocal = getLocalSync()
    .then(function(localSync) {
      return localSync.isUp()
      .then(function(isUp) {
        if (!isUp) {
          return localSync.start();
        }
      })
      .then(function() {
        return localSync;
      });
    });

  return Promise.join(startLocal, getRemoteSync(),
  function(localSync, remoteSync) {
    return remoteSync.wait()
    .then(function() {
      return localSync.linkDevices(remoteSync);
    })
    .then(function() {
      return Promise.resolve(volumes)
      .each(function(volume) {
        return localSync.shareFolder(volume.app, remoteSync);
      });
    })
    .all()
    .then(function() {
      return Promise.join(remoteSync.restartWait(), localSync.restartWait());
    });
  });
};

var stop = function() {
  logDebug('SHARE => Stopping.');

  var stopLocal = getLocalSync()
    .then(function(localSync) {
      return resetSync(localSync);
    });

  var stopRemote = container.isInstalled()
    .then(function(isInstalled) {
      if (isInstalled) {
        logDebug('SHARE => isInstalled => ' + isInstalled);
        return container.isRunning()
        .then(function(isRunning) {
          if (isRunning) {
            logDebug('SHARE => isRunning => ' + isRunning);
            return getRemoteSync()
            .then(function(remoteSync) {
              return resetSync(remoteSync);
            })
            .then(function() {
              logDebug('SHARE => Stopping container.');
              return container.stop();
            });
          }
        })
        .then(function() {
          logDebug('SHARE => Removing container.');
          return container.remove;
        });
      }
    });

  return Promise.all([stopLocal, stopRemote]);

};

var start = function() {
  var _volumes = null;
  return container.isInstalled()
  // Validate current state
  .then(function(isInstalled) {
    if (isInstalled) {
      return Promise.reject('Sync container is already installed.');
    }
  })
  // Create container
  .then(function() {
    return getVolumes()
    .then(function(volumes) {
      _volumes = volumes;
      var binds = _.map(volumes, function(x) {
        return [x.volume, '/' + x.app].join(':');
      });
      logDebug('SHARE => Creating container.');
      return container.create(binds);
    });
  })
  // Start container
  .then(function() {
    logDebug('SHARE => Starting container.');
    return container.start();
  })
  // Setup syncs
  .then(function() {
    if (_volumes && _volumes.length > 0) {
      return setupSyncs(_volumes);
    } else {
      return Promise.resolve();
    }
  });

};

var restart = exports.restart = function(cb) {
  logDebug('SHARE => Restarting...');
  // Stop
  stop()
  .delay(10000)
  // Start
  .then(function() {
    return start();
  })
  .then(function() {
    logDebug('SHARE => Finished restarting.');
    cb();
  })
  .catch(function(err) {
    logInfo('SHARE => Error while restarting.', err);
    cb(err);
  });
};
