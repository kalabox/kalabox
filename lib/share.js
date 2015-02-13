'use strict';

var engine = require('./engine.js');
var _ = require('lodash');
var services = require('./services/kalabox/services.js');
var Sync = require('./share/sync/sync.js');
var core = require('./core.js');
var Promise = require('bluebird');
var container = require('./share/sync/syncContainer.js');

var CONTAINER_NAME = 'kalabox_syncthing';

var log = function(msg) {
  console.log('SHARE => ' + msg);
};

var logVal = function(label, val) {
  log(label + ' -> ' + val);
};

var logData = function(label, data) {
  log(label + ' ==> ' + JSON.stringify(data, null, '  '));
};

var isAppRunning = function(appName) {
  return new Promise(function(fulfill, reject) {
    engine.list(appName, function(err, containers) {
      if (err) {
        reject(err);
      } else {
        var found = _.find(containers, function(container) {
          engine.inspect(container.name, function(err, data) {
            if (err) {
              reject(err);
            } else {
              fulfill(data.State.Running);
              return data.State.Running;
            }
          });
        });
      }
    });
  });
};

var getDataContainers = function() {
  return new Promise(function(fulfill, reject) {
    setTimeout(function() {
      engine.list(function(err, containers) {
        if (err) {
          reject(err);
        } else {
          fulfill(containers);
        }
      });
    }, 5 * 1000);
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
    console.log('data containers with an app running ' +
      JSON.stringify(dataContainers));
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

var updateBinds = function(binds, cb) {
  engine.stop(CONTAINER_NAME, function(err) {
    if (err) {
      cb(err);
    } else {
      var startOptions = services.syncthing().createOpts;
      startOptions.HostConfig.Binds = binds;
      engine.start(CONTAINER_NAME, startOptions, cb);
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
  return sync.clear()
  .then(function() {
    return sync.restartWait();
  });
};

var resetSyncs = function() {
  log('Resetting syncs.');
  return getLocalSync()
  .then(function(localSync) {
    return resetSync(localSync);
  })
  .then(function() {
    return getRemoteSync();
  })
  .then(function(remoteSync) {
    return resetSync(remoteSync);
  });
};

var setupSyncs = function(volumes) {
  log('Setting up syncs.');
  return Promise.join(getLocalSync(), getRemoteSync(),
  function(localSync, remoteSync) {
    return localSync.start()
    .then(function() {
      return remoteSync.wait();
    })
    .then(function() {
      return localSync.linkDevices(remoteSync);
    })
    .then(function() {
      return _.map(volumes, function(x) {
        return localSync.shareFolder(x.app, remoteSync);
      });
    })
    .all()
    .then(function() {
      return remoteSync.restartWait();
    })
    .then(function() {
      return localSync.restartWait();
    });
  });
};

var stop = function() {
  log('Stopping.');
  return container.isInstalled()
  .then(function(isInstalled) {
    log('isInstalled => ' + isInstalled);
    // If the container is installed
    if (isInstalled) {
      return container.isRunning()
      .then(function(isRunning) {
        log('isRunning => ' + isRunning);
        // If the container is running
        if (isRunning) {
          // Reset syncs
          return resetSyncs()
          // Stop container
          .then(function() {
            log('Stopping container.');
            return container.stop();
          });
        } else {
          return null;
        }
      })
      // Remove the container
      .then(function() {
        log('Removing container.');
        return container.remove();
      });
    }
  });
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
      log('Creating container.');
      return container.create(binds);
    });
  })
  // Start container
  .then(function() {
    log('Starting container.');
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
  log('Restarting...');
  // Stop
  stop()
  .delay(10000)
  // Start
  .then(function() {
    return start();
  })
  .then(function() {
    console.log('Finished restarting.');
    cb();
  })
  .catch(function(err) {
    cb(err);
  });
};
