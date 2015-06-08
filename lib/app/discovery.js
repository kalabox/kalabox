'use strict';

var path = require('path');
var Promise = require('bluebird');
Promise.longStackTraces();
var core = require('../core.js');
var _ = require('lodash');
var fs = Promise.promisifyAll(require('fs'));
var VError = require('verror');

// Constants.
// @todo: bcauldwell - This should be somewhere more central.
var APP_CONFIG_FILENAME = 'kalabox.json';

// Debug info logging function.
var logDebug = core.log.debug;

// Singleton data store for app directories.
var appDirCache = {};

// Cache an appDir by appName in data store.
var cacheAppDir = function(appName, appDir) {
  appDirCache[appName] = appDir;
};

// Get cached appDir by appName from data store.
var getCachedAppDir = function(appName) {
  var retVal = appDirCache[appName];
  if (retVal === undefined) {
    return null;
  } else {
    return retVal;
  }
};

// Get global config.
var getGlobalConfig = function() {
  return core.deps.lookup('globalConfig');
};

// Read from app registry file.
var getAppRegistry = function() {

  var globalConfig = getGlobalConfig();

  // Read contents of app registry file.
  return fs.readFileAsync(globalConfig.appRegistry)
  // Parse contents and return app dirs.
  .then(function(data) {
    var json = JSON.parse(data);
    if (json.appDirs) {
      return json.appDirs;
    } else {
      return [];
    }
  })
  // Handle no entry error.
  .catch(function(err) {
    if (err.code === 'ENOENT') {
      return null;
    } else {
      throw err;
    }
  });

};

// Rewrite the app registry file.
var setAppRegistry = function(appDirs) {

  var filepath = getGlobalConfig().appRegistry;

  var tempFilepath = filepath + '.tmp';

  var json = {
    appDirs: appDirs
  };

  // Write to temp file.
  return fs.writeFileAsync(tempFilepath, JSON.stringify(json))
  // Rename temp file to normal file.
  .then(function() {
    return fs.renameAsync(tempFilepath, filepath);
  });

};

// Get appDirs from app registry.
var getDirsAppRegistry = function() {
  // Get app registry.
  return getAppRegistry()
  .then(function(appDirs) {
    if (!appDirs) {
      // Write warning to log if appDirs were not found.
      logDebug('DISCO => App registry does NOT contain appDirs property!');
      return [];
    } else {
      return appDirs;
    }
  });
};

// Given an directory, inspect it and return the appName.
var inspectDir = function(dir) {

  var filepath = path.join(dir, APP_CONFIG_FILENAME);

  // Read contents of file.
  return fs.readFileAsync(filepath)
  .then(function(data) {
    return JSON.parse(data);
  })
  // Handle no entry error.
  .catch(function(err) {
    if (err.code === 'ENOENT') {
      return null;
    } else {
      throw new VError(err, 'Failed to load config: %s', filepath);
    }
  })
  // Return appName.
  .then(function(json) {
    if (!json) {
      return null;
    } else if (!json.appName) {
      logDebug('DISCO => Does NOT contain appName property!', filepath);
      return null;
    } else {
      cacheAppDir(json.appName, dir);
      return json.appName;
    }
  });

};

// Inspect a list of directories, return list of appNames.
var inspectDirs = function(dirs) {
  return Promise.map(dirs, inspectDir)
  .all()
  .filter(_.identity);
};

// Return list of app names from app registry dirs.
var list = exports.list = function(callback) {
  // Get list of dirs from app registry.
  return getDirsAppRegistry()
  // Map app dirs to app names.
  .then(inspectDirs)
  .all()
  .tap(function(appRegistryApps) {
    logDebug('DISCO => AppsRegistry dirs.', appRegistryApps);
  })
  .nodeify(callback);

};

// Gets the app directory for an appName.
var getAppDir = exports.getAppDir = function(appName, callback) {

  // Get app dir from cache.
  var appDir = getCachedAppDir(appName);

  // Init a promise.
  return Promise.resolve()
  .then(function() {

    if (appDir) {
      // Return cached value.
      return appDir;
    } else {
      // Reload and cache app dirs, then get app dir from cache again.
      return list()
      .then(function() {
        return getCachedAppDir(appName);
      });
    }

  })
  .nodeify(callback);

};

// Translate a filepath to a lock filepath for that filepath.
var toLockfilepath = function(filepath) {
  return filepath + '.lock';
};

// Return true if lock file exists.
var isLocked = function(filepath) {
  // Read file.
  return fs.readFileAsync(toLockfilepath(filepath))
  // File exists because we read it.
  .then(function(data) {
    return true;
  })
  // Handle no entry error.
  .catch(function(err) {
    if (err.code === 'ENOENT') {
      return false;
    } else {
      throw err;
    }
  });
};

// Acquire app registry lock file.
var acquireLock = function(filepath) {

  var lockFilepath = toLockfilepath(filepath);

  // Open lock file.
  return isLocked(filepath)
  .then(function(isLocked) {
    if (isLocked) {
      // Throw an error if the file already exists.
      throw new Error(filepath + ' already locked!');
    } else {
      return fs.openAsync(lockFilepath, 'wx');
    }
  })
  // Close lock file.
  .then(fs.closeAsync);

};

// Release app registry lock file.
var releaseLock = function(filepath) {

  var lockFilepath = toLockfilepath(filepath);

  // Check to make sure lock file exists.
  isLocked(filepath)
  .then(function(isLocked) {
    if (!isLocked) {
      // Throw an error if the file does not exist.
      throw new Error('Tried to unlock lock file which does NOT exist ' +
        lockFilepath);
    }
  })
  // Unlink lock file.
  .then(function() {
    return fs.unlinkAsync(lockFilepath);
  });

};

var registerAppDir = exports.registerAppDir = function(dir, callback) {

  var filepath = getGlobalConfig().appRegistry;

  var locked = false;

  // Acquire lock.
  acquireLock(filepath)
  .then(function() {
    locked = true;
    // Get app dirs.
    return getAppRegistry()
    .then(function(appDirs) {
      if (!appDirs) {
        appDirs = [];
      }
      // Add appDir to app registry.
      var alreadyExists = _.find(appDirs, _.partial(_.isEqual, dir));
      if (!alreadyExists) {
        appDirs.push(dir);
        return setAppRegistry(appDirs);
      }
    });
  })
  // Make sure we always release the lock.
  .finally(function() {
    if (locked) {
      return releaseLock(filepath);
    }
  })
  // Return.
  .nodeify(callback);

};
