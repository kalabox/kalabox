'use strict';

var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var core = require('../core.js');
var _ = require('lodash');

// Constants
var APP_CONFIG_FILENAME = 'kalabox.json';

var log = function(msg) {
  //console.log('APP DISCOVERY => ' + msg);
};

var appDirCache = {};

var cacheAppDir = function(appName, appDir) {
  appDirCache[appName] = appDir;
};

var getCachedAppDir = function(appName) {
  var retVal = appDirCache[appName];
  if (retVal === undefined) {
    return null;
  } else {
    return retVal;
  }
};

var getGlobalConfig = function() {
  return core.deps.call(function(globalConfig) {
    return globalConfig;
  });
};

var getDirsAppsRoot = function() {
  return new Promise(function(fulfill, reject) {
    var globalConfig = getGlobalConfig();
    var appsRoot = globalConfig.appsRoot;
    fs.exists(appsRoot, function(exists) {
      if (exists) {
        fs.readdir(appsRoot, function(err, files) {
          if (err) {
            reject(err);
          } else {
            var filepaths = _.map(files, function(file) {
              return path.join(appsRoot, file);
            });
            fulfill(filepaths);
          }
        });
      }
      else {
        fulfill([]);
      }
    });
  });
};

var getAppRegistry = function() {
  return new Promise(function(fulfill, reject) {
    var globalConfig = getGlobalConfig();
    var filepath = globalConfig.appRegistry;
    fs.exists(filepath, function(exists) {
      if (!exists) {
        fulfill(); // basically returns undefined
      } else {
        fs.readFile(filepath, function(err, data) {
          if (err) {
            reject(err);
          } else {
            fulfill(JSON.parse(data).appDirs);
          }
        });
      }
    });
  });
};

var setAppRegistry = function(appDirs) {
  var json = {
    appDirs: appDirs
  };
  return new Promise(function(fulfill, reject) {
    var globalConfig = getGlobalConfig();
    var filepath = globalConfig.appRegistry;
    var tempFilepath = filepath + '.tmp';
    fs.writeFile(tempFilepath, JSON.stringify(json), function(err) {
      if (err) {
        reject(err);
      } else {
        fs.rename(tempFilepath, filepath, function(err) {
          if (err) {
            reject(err);
          } else {
            fulfill();
          }
        });
      }
    });
  });
};

var getDirsAppRegistry = function() {
  return getAppRegistry()
  .then(function(appDirs) {
    if (!appDirs) {
      log('App registry does NOT contain appDirs property!');
      return [];
    } else {
      return appDirs;
    }
  });
};

var inspectDir = function(dir) {
  return new Promise(function(fulfill, reject) {
    var filepath = path.join(dir, APP_CONFIG_FILENAME);
    fs.exists(filepath, function(exists) {
      if (!exists) {
        log(filepath + ' does NOT exist!');
        fulfill(null);
      } else {
        fs.readFile(filepath, function(err, data) {
          if (err) {
            reject(err);
          } else {
            var json = JSON.parse(data);
            if (!json.appName) {
              log(filepath + ' does NOT contain appName property!');
              fulfill(null);
            } else {
              cacheAppDir(json.appName, dir);
              fulfill(json.appName);
            }
          }
        });
      }
    });
  });
};

var inspectDirs = function(dirs) {
  return Promise.reduce(dirs, function(acc, dir) {
    return inspectDir(dir)
    .then(function(appName) {
      if (appName) {
        acc.push(appName);
      }
      return acc;
    });
  }, []);
};

var list = exports.list = function(callback) {
  // Get app dirs from appsRoot dir
  var appsRootApps = inspectDirs(getDirsAppsRoot())
  .all();

  // Get app dirs from app registry file
  var appRegistryApps = inspectDirs(getDirsAppRegistry())
  .all();

  Promise.join(appsRootApps, appRegistryApps,
    function(appsRootApps, appRegistryApps) {
      callback(null, appsRootApps.concat(appRegistryApps));
    })
  .catch(function(err) {
    callback(err);
  });
};

var getAppDir = exports.getAppDir = function(appName, callback) {
  var appDir = getCachedAppDir(appName);
  if (!appDir) {
    // Init app dir cache using call to list.
    list(function(err, dirs) {
      if (err) {
        callback(err);
      } else {
        callback(null, getCachedAppDir(appName));
      }
    });
  } else {
    callback(null, appDir);
  }
};

var toLockfilepath = function(filepath) {
  return filepath + '.lock';
};

var acquireLock = function(filepath) {
  var lockFilepath = toLockfilepath(filepath);
  return new Promise(function(fulfill, reject) {
    fs.exists(lockFilepath, function(exists) {
      if (exists) {
        reject(new Error(lockFilepath + ' already locked!'));
      } else {
        fs.open(lockFilepath, 'wx', function(err, fd) {
          if (err) {
            reject(err);
          } else {
            fs.close(fd, function(err) {
              if (err) {
                reject(err);
              } else {
                fulfill(true);
              }
            });
          }
        });
      }
    });
  });
};

var releaseLock = function(filepath) {
  return new Promise(function(fulfill, reject) {
    var lockFilepath = toLockfilepath(filepath);
    fs.exists(lockFilepath, function(exists) {
      if (exists) {
        fs.unlink(lockFilepath, function(err) {
          if (err) {
            reject(err);
          } else {
            fulfill();
          }
        });
      } else {
        reject(new Error('Tried to unlock lock file which does NOT exist ' +
          lockFilepath));
      }
    });
  });

};

var registerAppDir = exports.registerAppDir = function(dir, callback) {
  var globalConfig = getGlobalConfig();
  var filepath = globalConfig.appRegistry;
  var locked = false;
  acquireLock(filepath)
  .then(function(lockAcquired) {
    locked = lockAcquired;
    return getAppRegistry()
    .then(function(appDirs) {
      if (!appDirs) {
        appDirs = [];
      }
      var alreadyExists = _.find(appDirs, function(appDir) {
        return appDir === dir;
      });
      if (!alreadyExists) {
        appDirs.push(dir);
        return setAppRegistry(appDirs);
      } else {
        return undefined;
      }
    });
  })
  .then(function() {
    if (locked) {
      releaseLock(filepath);
    }
    callback();
  })
  .catch(function(err) {
    if (locked) {
      releaseLock(filepath);
    }
    callback(err);
  });
};
