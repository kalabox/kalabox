'use strict';

var engine = require('./engine.js');
var _ = require('lodash');
var services = require('./services/kalabox/services.js');
var Sync = require('./share/sync.js');
var core = require('./core.js');

var CONTAINER_NAME = 'kalabox_syncthing';

var log = function(msg) {
  console.log('SHARE: ' + msg);
};

var logVal = function(label, val) {
  log(label + ' -> ' + val);
};

var logData = function(label, data) {
  log(label + ' ==> ' + JSON.stringify(data, null, '  '));
};

var getDataContainer = function(appName, cb) {
  engine.list(function(err, containers) {
    if (err) {
      cb(err);
    } else {
      var dataContainer = _.find(containers, function(container) {
        // @todo: this is jank as hell, and needs to be standardized
        // reused across all of kalabox.
        var parts = container.name.split('_');
        var keep = parts.length === 3 &&
          parts[0] === 'kb' &&
          parts[1] === appName &&
          parts[2] === 'data';
        if (keep) {
          log('[' + container.name + '] IS a valid data container.');
        } else {
          log('[' + container.name + '] is NOT a valid data container.');
        }
        return keep;
      });
      if (dataContainer === undefined) {
        cb(null, null);
      } else {
        cb(null, dataContainer);
      }
    }
  });
};

var getSharedDir = function(appName, cb) {
  getDataContainer(appName, function(err, dataContainer) {
    if (err) {
      cb(err);
    } else if (dataContainer === null) {
      cb(null, null);
    } else {
      engine.inspect(dataContainer.name, function(err, data) {
        if (err) {
          cb(err);
        } else {
          logData('Data container volume info', data.Volumes);
          if (data.Volumes['/data']) {
            cb(null, data.Volumes['/data']);
          } else {
            cb(null, null);
          }
        }
      });
    }
  });
};

var getCurrentShares = function(cb) {
  engine.inspect(CONTAINER_NAME, function(err, data) {
    if (err) {
      cb(err);
    } else {
      logData('Current shares', data);
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
      startOptions.Binds = binds;
      logData('startOpts', startOptions);
      engine.start(CONTAINER_NAME, startOptions, cb);
    }
  });
};

var sharesToBinds = function(shares) {
  logData('shareToBinds:IN', shares);
  var result = _.transform(shares, function(result, val, key) {
    result[val] = key;
  });
  logData('shareToBinds:OUT', result);
  return result;
};

var addAppShare = function(app, cb) {
  var appName = app.name;
  logVal('app name', appName);
  getCurrentShares(function(err, shares) {
    if (err) {
      cb(err);
    } else {
      getSharedDir(appName, function(err, sharedDir) {
        if (err) {
          cb(err);
        } else {
          logVal('sharedDir', sharedDir);
          shares['/' + appName] = sharedDir;
          var binds = sharesToBinds(shares);
          logData('binds', binds);
          updateBinds(binds, cb);
        }
      });
    }
  });
};

var getLocalSync = function() {
  return new Sync('127.0.0.1');
};

var getRemoteSync = function() {
  return core.deps.call(function(engineConfig) {
    return new Sync(engineConfig.host);
  });
};

var appStart = exports.appStart = function(app, cb) {
  // Share volume
  addAppShare(app, function(err) {
    if (err)     {
      cb(err);
    } else {
      // Link syncthing devices and share folder.
      var localSync = getLocalSync();
      var remoteSync = getRemoteSync();
      localSync.start()
      .then(function() {
        remoteSync.wait()
        .then(function() {
          return localSync.linkDevices(remoteSync);
        })
        .then(function() {
          return localSync.shareFolder(app.name, remoteSync);
        })
        .then(function() {
          return localSync.restartWait();
        })
        .then(function() {
          return remoteSync.restartWait();
        })
        .then(function() {
          cb(null);
        })
        .catch(function(err) {
          cb(err);
        });
      })
      .catch(function(err) {
        cb(err);
      });
    }
  });
};

var appStop = exports.appStop = function(app, cb) {
  var remoteSync = getRemoteSync();
  remoteSync.removeFolder(app.name)
  .then(function() {
    cb(null);
  })
  .catch(function(err) {
    cb(err);
  });
};
