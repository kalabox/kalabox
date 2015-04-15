/**
 * Module for loading of plugins and external modules. Handles injecting the
 * main Kalabox api into the modules.
 * @module kbox#require
 */

'use strict';

var S = require('string');
var _ = require('lodash');
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var util = require('util');
var _util = require('./util.js');

var __require = require;

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
var requireFromNodeModules = function(id, callback) {
  var mod = null;
  try {
    mod = module.parent.parent.require(id);
  } catch (err) {
    if (!S(err.message).startsWith('Cannot find module')) {
      return callback(new KboxRequireError(id, err));
    }
  }
  callback(null, mod);
};

/*
 * A custom require that searches some directories for the
 * module to be loaded. Null is returned if the module cannot
 * be found.
 */
var requireFromOtherDirs = function(kbox, id, callback) {
  // Use custom search to locate module.
  var filepathsToSearch = kbox.core.deps.call(function(globalConfig) {
    var app = kbox.core.deps.lookup('app', {optional: true});
    var dirs = [
      globalConfig.srcRoot,
      globalConfig.kalaboxRoot
    ];
    if (app) {
      dirs.push(app.config.appRoot);
    }
    var arr = [];
    _.each(dirs, function(dir) {
      [
        'node_modules',
        'plugins'
      ].forEach(function(x) {
        arr.push(path.join(dir, x, id, 'index.js'));
      });
    });
    return arr;
  });
  var filepath = _.find(filepathsToSearch, fs.existsSync);
  var mod = null;
  if (filepath) {
    try {
      mod = require(filepath);
    } catch (err) {
      return callback(new KboxRequireError(filepath, err));
    }
  }
  callback(null, mod);
};

/*
 * Instead of just doing a require, try to load the module from various
 * different places and even try a 'npm install' if it's a valid npm
 * package.
 */
var requireFromNodeModulesAndOtherDirs = function(kbox, id, callback) {
  // Try to load module from node_modules directory.
  requireFromNodeModules(id, function(err, mod) {
    if (err) {
      callback(err);
    } else if (mod) {
      callback(null, mod);
    } else {
      // Try to load module from other directories.
      requireFromOtherDirs(kbox, id, callback);
    }
  });
};

/*
 * Instead of just doing a require, try to load the module from various
 * different places.
 */
var requireModule = function(kbox, id, callback) {
  // Try to load module from node_modules and other directories.
  var parts = id.split('@');
  var pkg = parts[0];
  var ver = parts[1];
  requireFromNodeModulesAndOtherDirs(kbox, pkg, function(err, mod) {
    if (err || mod) {
      callback(err, mod);
    } else {
      callback(null, mod);
    }
  });
};

/*
 * The main guts of the module.
 */
var requireInternal = function(kbox, id, callback) {

  // Try to load module.
  requireModule(kbox, id, function(err, mod) {
    if (err) {

      callback(err);

    } else if (!mod) {

      // Module could not be loaded, throw an error.
      callback(new Error('Cannot find module ' + id +
        ' try an npm install first.'));

    } else {

      // Module was successfully loaded.
      if (typeof mod === 'object') {

        // Nothing extra needs to be done, just return module.
        return callback(null, mod);

      } else if (typeof mod === 'function') {

        if (mod.length === 0) {

          // No arguments, so just execute function and return.
          return callback(null, mod());

        } else {

          // Argument names of the mod function.
          var args = inspect(mod);
          
          if (args.length === 1 && args[0] === 'kbox') {

            // Execute module function, and catch decorate and report errors.
            var result;
            try {
              result = mod(kbox);
            } catch (err) {
              return callback(new KboxRequireError(id, err));
            }

            // Return the result.
            return callback(null, result);

          } else {
            
            // Module function has an incorrect signature, throw an error.
            var funcString = mod.toString().split('\n')[0];
            var err = new Error('Module "' + id + '" has an invalid ' +
              'signature. It was expected to be a function with a ' +
              'single argument of kbox, but instead it was: ' + funcString);
            return callback(err);

          }

        }

      } else {

        // This should never happen so assert fail if it does.
        assert.fail(undefined, undefined,
          'Required module expected to be either function or object');

      }

    }

  });

};

/*
 * Load module and inject kalabox api into module.
 */
exports.require = function(kbox, id, callback) {

  if (typeof callback !== 'function') {
    // Validate callback function.
    throw new TypeError('Invalid callback: ' + typeof callback);
  }

  if (typeof kbox !== 'object') {
    // Validate kbox.
    return callback(new TypeError('Invalid kbox object.'));
  }

  if (typeof id !== 'string') {
    // Validate id.
    return callback(new TypeError('Invalid module id.'));
  }

  if (cache[id]) {
    // Return module from cache.
    callback(null, cache[id]);
  } else {
    // Load module, store in cache, then return.
    requireInternal(kbox, id, function(err, mod) {
      if (err) {
        callback(err);
      } else {
        if (typeof mod !== 'object') {
          mod = {};
        }
        cache[id] = mod;
        callback(null, mod);
      }
    });
  }
};
