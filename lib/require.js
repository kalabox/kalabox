/**
 * Module for loading of plugins and external modules. Handles injecting the
 * main Kalabox api into the modules.
 *
 * @name require
 */

'use strict';

/*
 * Intrinsic node modules.
 */
var assert = require('assert');
var path = require('path');
var util = require('util');

/*
 * Npm modules.
 */
var _ = require('lodash');
var Promise = require('bluebird');
Promise.longStackTraces();

/*
 * Promisified modules.
 */
var fs = Promise.promisifyAll(require('fs'));

/*
 * Kbox modules.
 */

/*
 * Singleton object used to cache previously loaded modules.
 */
var cache = {};

/*
 * Given a callback function, inspect the function's arguments, and return
 * an array of strings representing the names of the function's arguments.
 */
var inspect = function(cb) {
  var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
  var text = cb.toString();
  var rawArgs = text.match(FN_ARGS)[1];
  if (rawArgs === '') {
    return [];
  } else {
    var trim = function(v) { return v.trim(); };
    var args = rawArgs.split(',').map(trim);
    return args;
  }
};

/*
 * Subclassed Error for a more useful and specific error.
 */
function KboxRequireError(id, err) {
  Error.call(this);
  this.message = [id, err.message].join(' -> ');
  this.stack = [this.message, err.stack].join('\n');
}
util.inherits(KboxRequireError, Error);

/*
 * A regular run of the mill require, but return null if the
 * module cannot be found.
 */
var requireFromNodeModules = function(parentModule, id, callback) {

  // Try to load the module.
  return Promise.try(function() {
    return parentModule.require(id);
  })
  // Ignore module not found errors, and decorate all others.
  .catch(function(err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      throw new KboxRequireError(id, err);
    }
  })
  // Return.
  .nodeify(callback);

};

/*
 * A custom require that searches some directories for the
 * module to be loaded. Null is returned if the module cannot
 * be found.
 */
var requireFromOtherDirs = function(kbox, id, app, callback) {

  if (typeof callback === 'undefined' && typeof app === 'function') {
    callback = app;
    app = undefined;
  }

  // Get global config.
  var globalConfig = kbox.core.deps.lookup('globalConfig');

  // List of dirs that we care about.
  var dirs = [
    globalConfig.srcRoot,
    globalConfig.globalPluginRoot
  ];
  if (app) {
    dirs.push(app.config.appRoot);
  }

  // Each dir could have any of these sub dirs.
  var subDirs = [
    'node_modules',
    'plugins'
  ];

  // Helper function that lodash should be ashamed for not having. :P
  var flattenMap = function(elts, iterator) {
    return _(elts)
    .chain()
    .map(iterator)
    .flatten()
    .value();
  };

  // Map dirs to full list of paths.
  var paths = flattenMap(dirs, function(dir) {
    return _.map(subDirs, function(subDir) {
      return path.join(dir, subDir, id, 'index.js');
    });
  });

  // Filter paths by existance.
  return Promise.filter(paths, fs.existsSync)
  .all()
  // Grab only the first path.
  .then(function(paths) {
    return _.head(paths);
  })
  // If a path exists try to require it.
  .then(function(path) {
    if (path) {
      return Promise.try(function() {
        return require(path);
      })
      .catch(function(err) {
        // Decorate the error.
        throw new KboxRequireError(path, err);
      });
    }
  })
  // Return.
  .nodeify(callback);

};

/*
 * Instead of just doing a require, try to load the module from various
 * different places and even try a 'npm install' if it's a valid npm
 * package.
 */
var requireFromNodeModulesAndOtherDirs =
  function(parentModule, kbox, id, app, callback) {

  if (typeof callback === 'undefined' && typeof app === 'function') {
    callback = app;
    app = undefined;
  }

  // Try to load module from node_module directories.
  return requireFromNodeModules(parentModule, id)
  // If module was not found in node_module directories, try to load
  // from other directories.
  .then(function(mod) {
    if (mod) {
      return mod;
    } else {
      return requireFromOtherDirs(kbox, id, app);
    }
  })
  // Return.
  .nodeify(callback);

};

/*
 * Instead of just doing a require, try to load the module from various
 * different places.
 */
var requireModule = function(parentModule, kbox, id, app, callback) {

  if (typeof callback === 'undefined' && typeof app === 'function') {
    callback = app;
    app = undefined;
  }

  // Try to load module from node_modules and other directories.
  var parts = id.split('@');
  var pkg = parts[0];
  //var ver = parts[1];

  // Try to load module.
  return requireFromNodeModulesAndOtherDirs(parentModule, kbox, pkg, app)
  // Return.
  .nodeify(callback);

};

/*
 * The main guts of the module.
 */
var requireInternal = function(parentModule, kbox, id, app, callback) {

  if (typeof callback === 'undefined' && typeof app === 'function') {
    callback = app;
    app = undefined;
  }

  // Try to load the module.
  return requireModule(parentModule, kbox, id, app)
  // If no module was loaded throw an error.
  .tap(function(mod) {
    if (!mod) {
      throw new Error('Cannot find module ' + id +
        ' try an npm install first.');
    }
  })
  // Handle different kinds of module initializations.
  .then(function(mod) {

    // Module was successfully loaded.
    if (typeof mod === 'object') {

      // Nothing extra needs to be done, just return module.
      return mod;

    } else if (typeof mod === 'function') {

      if (mod.length === 0) {

        // No arguments, so just execute function and return.
        return Promise.try(function() {
          return mod();
        })
        // Decorate any errors.
        .catch(function(err) {
          throw new KboxRequireError(id, err);
        });

      } else {

        // Argument names of the mod function.
        var args = inspect(mod);

        if (args.length === 1 && args[0] === 'kbox') {

          // Execute module function.
          return Promise.try(function() {
            return mod(kbox);
          })
          // Decorate any errors.
          .catch(function(err) {
            throw new KboxRequireError(id, err);
          });

        } else if (args.length === 2 &&
          args[0] === 'kbox' &&
          args[1] === 'app') {

          // Execute module function.
          return Promise.try(function() {
            return mod(kbox, app);
          })
          // Decorate any errors.
          .catch(function(err) {
            throw new KboxRequireError(id, err);
          });

        } else {

          // Module function has an incorrect signature, throw an error.
          var funcString = mod.toString().split('\n')[0];
          throw new Error('Module "' + id + '" has an invalid ' +
            'signature. It was expected to be a function with a ' +
            'single argument of kbox, but instead it was: ' + funcString);

        }

      }

    } else {

      // This should never happen so assert fail if it does.
      assert.fail(undefined, undefined,
        'Required module expected to be either function or object');

    }

  })
  // Return.
  .nodeify(callback);

};

/*
 * Load module and inject kalabox api into module.
 */
exports.require = function(parentModule, kbox, id, app, callback) {

  if (typeof kbox !== 'object') {
    // Validate kbox.
    throw new TypeError('Invalid kbox object.');
  }

  if (typeof id !== 'string') {
    // Validate id.
    throw new TypeError('Invalid module id.');
  }

  if (typeof callback === 'undefined' && typeof app === 'function') {
    callback = app;
    app = undefined;
  }

  // Try to get module from cache.
  return Promise.resolve(cache[id + _.get(app, 'name')])
  // If module was not cached, try to load it.
  .then(function(mod) {
    if (mod) {
      return mod;
    } else {
      return requireInternal(parentModule, kbox, id, app);
    }
  })
  // Make sure we only return objects.
  .then(function(mod) {
    if (typeof mod !== 'object') {
      mod = {};
    }
    return mod;
  })
  // Cache module.
  .tap(function(mod) {
    cache[id] = mod;
  })
  // Return.
  .nodeify(callback);

};
