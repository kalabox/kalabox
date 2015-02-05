'use strict';

var engine = require('./engine.js');
var _ = require('lodash');
var services = require('./services/kalabox/services.js');
//var S = require('string');
var Sync = require('./share/sync.js');
var core = require('./core.js');

/*var getBinds = function(cb) {
  getDataContainerNames(function(err, containers) {
    if (err) {
      cb(err);
    } else {
      var rec = function(containers, binds) {
        if (containers.length === 0) {
          cb(null, binds);
        } else {
          var hd = containers[0];
          var tl = containers.slice(1);
          engine.inspect(hd.name, function(err, data) {
            if (err) {
              cb(err);
            } else {
              if (data.Volumes['/data']) {
                var bind = [
                  data.Volumes['/data'],
                  '/' + hd.app
                ].join(':');
                binds.push(bind);
              }
              rec(tl, binds);
            }
          });
        }
      };
      rec(containers, []);
    }
  });
};*/

var CONTAINER_NAME = 'kalabox_syncthing';

var getDataContainer = function(appName, cb) {
  engine.list(function(err, containers) {
    if (err) {
      cb(err);
    } else {
      var dataContainer = _.find(containers, function(container) {
        // @todo: this is jank as hell, and needs to be standardized
        // reused across all of kalabox.
        var parts = container.name.split('_');
        return parts.length === 3 &&
          parts[0] === 'kb' &&
          parts[1] === appName &&
          parts[2] === 'data';
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
      console.log('startOpts: ' + JSON.stringify(startOptions, null, ' '));
      engine.start(CONTAINER_NAME, startOptions, cb);
    }
  });
};

var sharesToBinds = function(shares) {
  console.log('in: ' + JSON.stringify(shares, null, '  '));
  var result = _.transform(shares, function(result, val, key) {
    result[val] = key;
  });
  console.log('out: ' + JSON.stringify(result, null, '  '));
  return result;
};

var addAppShare = function(app, cb) {
  var appName = app.name;
  getCurrentShares(function(err, shares) {
    if (err) {
      cb(err);
    } else {
      getSharedDir(appName, function(err, sharedDir) {
        if (err) {
          cb(err);
        } else {
          shares['/' + appName] = sharedDir;
          var binds = sharesToBinds(shares);
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
    console.log('engineConfig.host: ' + engineConfig.host);
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
    }
  });
};

var appStop = exports.appStop = function(app, cb) {
  var remoteSync = getRemoteSync();
  remoteSync.removeFolder(app.name)
  /*.then(function() {
    return remoteSync.restartWait();
  })*/
  .then(function() {
    cb(null);
  })
  .catch(function(err) {
    cb(err);
  });
};

/*var removeAppShare = exports.removeAppShare = function(app, cb) {
  var appName = app.name;
  getCurrentShares(function(err, shares) {
    if (err) {
      cb(err);
    } else {
      var newShares = _.omit(shares, '/' + appName);
      //var binds = sharesToBinds(newShares);
      //updateBinds(binds, cb);
      engine.stop(CONTAINER_NAME, function(err) {
        if (err) {
          cb(err);
        } else {
          var startOptions = services.syncthing().createOpts;
          startOptions.Volumes = newShares;
          console.log('startOpts: ' + JSON.stringify(startOptions, null, ' '));
          engine.start(CONTAINER_NAME, startOptions, cb);
        }
      });
    }
  });
};*/
