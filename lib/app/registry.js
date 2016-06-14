/**
 * Handles app registration.
 *
 * @name registry
 */

'use strict';

var path = require('path');
var Promise = require('../promise.js');
var core = require('../core.js');
var util = require('../util.js');
var _ = require('lodash');
var fs = require('fs-extra');
var VError = require('verror');

// Serializer for access to register lock.
var serializer = new util.Serializer();

// Constants.
var APP_CONFIG_FILENAME = 'kalabox.yml';

// Debug info logging function.
var log = require('./../core/log.js').make('APP REGISTRY');

// Singleton data store for app directories.
var appCache = {};

// Returns true if two apps are equal.
function appsAreEqual(x, y) {
  function pp(o) {
    return JSON.stringify(o);
  }
  var xs = pp(x);
  var ys = pp(y);
  return xs === ys;
}

// Returns true if app already exists in cache.
function existsInCache(x, cache) {
  var found = _.find(cache, function(y) {
    return appsAreEqual(x, y);
  });
  return !!found;
}

// Cache an appDir by appName in data store.
var cacheApp = function(app) {
  if (!appCache.good) {
    appCache.good = [];
  }
  if (!existsInCache(app, appCache.good)) {
    appCache.good.push(app);
  }
};

// Cache an appDir by appName in bad app data store.
var cacheBadApp = function(app) {
  if (!appCache.bad) {
    appCache.bad = [];
  }
  if (!existsInCache(app, appCache.bad)) {
    appCache.bad.push(app);
  }
};

// Clear out caches
var cacheClear = function() {
  appCache = {};
};

// Get global config.
var getGlobalConfig = function() {
  return core.deps.lookup('globalConfig');
};

// Read from app registry file.
var getAppRegistry = function() {

  var globalConfig = getGlobalConfig();
  // Read contents of app registry file.
  return Promise.fromNode(function(cb) {
    fs.readFile(globalConfig.appRegistry, {encoding: 'utf8'}, cb);
  })
  // Parse contents and return app dirs.
  .then(function(data) {
    var json = JSON.parse(data);
    if (json) {
      return json;
    } else {
      return [];
    }
  })
  // Handle no entry error.
  .catch(function(err) {
    if (err.code === 'ENOENT') {
      return [];
    } else {
      throw err;
    }
  });

};

// Rewrite the app registry file.
var setAppRegistry = function(apps) {

  var filepath = getGlobalConfig().appRegistry;

  var tempFilepath = filepath + '.tmp';

  // Write to temp file.
  return Promise.fromNode(function(cb) {
    fs.writeFile(tempFilepath, JSON.stringify(apps), cb);
    log.debug('Setting app registry', apps);
  })
  // Rename temp file to normal file.
  .then(function() {
    return Promise.fromNode(function(cb) {
      fs.rename(tempFilepath, filepath, cb);
    });
  });

};

// Given an app, inspect it and return the appName.
var inspectDir = function(app) {

  var filepath = path.join(app.dir, APP_CONFIG_FILENAME);

  // Read contents of file.
  return Promise.fromNode(function(cb) {
    fs.readFile(filepath, {encoding: 'utf8'}, cb);
  })
  // Handle no entry error.
  .catch(function(err) {
    if (err.code === 'ENOENT') {
      cacheBadApp(app);
    } else {
      throw new VError(err, 'Failed to load config: %s', filepath);
    }
  })
  // Return appName.
  .then(function(data) {
    var json = util.yaml.dataToJson(data);
    if (!json) {
      return null;
    }
    else if (!json.name) {
      log.debug('Does NOT contain appName property!', filepath);
      return null;
    }
    else if (json.name === app.name) {
      cacheApp(app);
      return app;
    }
    else if (json.name !== app.name) {
      cacheBadApp(app);
      return null;
    }
    else {
      return null;
    }
  });

};

// Inspect a list of directories, return list of appNames.
var inspectDirs = function(apps) {
  return Promise.map(apps, inspectDir)
  .all()
  .filter(_.identity);
};

// Return list of app names from app registry dirs.
var list = function() {
  // Get list of dirs from app registry.
  return getAppRegistry()
  // Map app dirs to app names.
  .then(inspectDirs)
  .all()
  .tap(function(appRegistryApps) {
    log.debug('Apps from registry:', appRegistryApps);
  });

};

// Get app helped
var getAppCache = function(cache) {
  // Init a promise.
  return Promise.resolve()
  .then(function() {

    if (!_.isEmpty(appCache)) {
      // Return cached value.
      return appCache[cache] || [];
    } else {
      // Reload and cache app dirs, then get app dir from cache again.
      return list()
      .then(function() {
        return appCache[cache] || [];
      });
    }

  });
};

/**
 * Gets a list of apps.
 * @return {Promise} A promise containing a list of apps.
 * @memberof registry
 * @example
 * // Get list of app names.
 * return kbox.app.registry.getApps()
 * // Map list of app names to list of apps.
 * .then(function(apps) {
 *   return Promise.map(apps, function(app) {
 *     var config = kbox.core.config.getAppConfig(app.dir);
 *     return create(app.name, config);
 *   })
 *   .all();
 * })
 */
var getApps = exports.getApps = function(opts) {
  opts = opts || {};
  opts.useCache = opts.useCache === undefined ? true : opts.useCache;
  if (!opts.useCache) {
    cacheClear();
  }
  return getAppCache('good');
};

/**
 * Gets a list of potentially corrupted apps.
 * @return {Promise} A promise containing a list of apps.
 * @example
 * // Get list of app names.
 * return kbox.app.registry.getBadApps()
 * // Map list of app names to list of apps.
 * .then(function(apps) {
 *   return Promise.map(apps, function(app) {
 *     var config = kbox.core.config.getAppConfig(app.dir);
 *     return create(app.name, config);
 *   })
 *   .all();
 * })
 */
exports.getBadApps = function() {
  return getAppCache('bad');
};

// Translate a filepath to a lock filepath for that filepath.
var toLockfilepath = function(filepath) {
  return filepath + '.lock';
};

// Return true if lock file exists.
var isLocked = function(filepath) {
  // Read file.
  return Promise.fromNode(function(cb) {
    fs.readFile(toLockfilepath(filepath), {encoding: 'utf8'}, cb);
  })
  // File exists because we read it.
  .then(function() {
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

  // Open lock file.
  return isLocked(filepath)
  .then(function(isLocked) {
    if (isLocked) {
      // Throw an error if the file already exists.
      throw new Error(filepath + ' already locked!');
    } else {
      return Promise.fromNode(function(cb) {
        fs.open(toLockfilepath(filepath), 'wx', cb);
        log.debug('Registry locked.');
      });
    }
  })
  // Close lock file.
  .then(function(data) {
    return Promise.fromNode(function(cb) {
      fs.close(data, cb);
    });
  });

};

// Release app registry lock file.
var releaseLock = function(filepath) {

  var lockFilepath = toLockfilepath(filepath);

  // Check to make sure lock file exists.
  return isLocked(filepath)
  .then(function(isLocked) {
    if (!isLocked) {
      // Throw an error if the file does not exist.
      throw new Error('Tried to unlock lock file which does NOT exist ' +
        lockFilepath);
    }
  })
  // Unlink lock file.
  .then(function() {
    return Promise.fromNode(function(cb) {
      fs.unlink(lockFilepath, cb);
      log.debug('Releasing lock.');
    });
  });

};

var actionApp = function(app, action) {

  var filepath = getGlobalConfig().appRegistry;

  // Acquire lock.
  return acquireLock(filepath)
  .then(function() {
    // Get app dirs.
    return getApps()
    .then(function(apps) {

      // Check if we already have an app with this name
      var alreadyExists = _.find(apps, function(a) {
        return a.name === app.name;
      });

      // Go through add checks
      if (action === 'add' && !alreadyExists) {
        apps.push(app);
        return setAppRegistry(apps).then(cacheClear);
      }

      // Go through remove checks
      else if (action === 'remove' && alreadyExists) {
        _.remove(apps, function(b) {
          return b.name === app.name;
        });
        return setAppRegistry(apps).then(cacheClear);
      }

    });
  })

  // Make sure we always release the lock.
  .then(function() {
    return releaseLock(filepath);
  });

};

/**
 * Adds an app to the app registry.
 * @param {Object} app An app object
 * @return {Promise} A promise.
 * @example
 * // Get list of app names
 * return kbox.app.registry.getBadApps()
 * // Map list of app names to list of apps.
 * .then(function(apps) {
 *   return Promise.map(apps, function(app) {
 *     var config = kbox.core.config.getAppConfig(app.dir);
 *     return create(app.name, config);
 *   })
 *   .all();
 * })
 */
exports.registerApp = function(app) {
  // Run through serializer.
  return serializer.enqueue(function() {
    // Add the app
    return actionApp(app, 'add');
  });
};

/**
 * Gets a list of potentially corrupted apps.
 * @return {Promise} A promise containing a list of apps.
 * @example
 * // Get list of app names.
 * return kbox.app.registry.getBadApps()
 * // Map list of app names to list of apps.
 * .then(function(apps) {
 *   return Promise.map(apps, function(app) {
 *     var config = kbox.core.config.getAppConfig(app.dir);
 *     return create(app.name, config);
 *   })
 *   .all();
 * })
 */
exports.removeApp = function(app) {
  // Run through serializer.
  return serializer.enqueue(function() {
    // Remove the app
    return actionApp(app, 'remove');
  });
};
