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
 * Return true if this argument key is a registered dependency.
 */
var isRegisteredArg = function(kbox, key) {
  return kbox.core.deps.contains(key);
};

/*
 * List of argument keys that fit into the NEW way of loading modules.
 */
var validKboxArgs = ['kbox', 'app'];

/*
 * Return true if the argument key fits into the NEW way of loading modules.
 */
var isValidKboxArg = function(key) {
  return _.contains(validKboxArgs, key);
};

/*
 * Map an array of argument keys to an array of values.
 */
var mapArgs = function(obj, keys) {
  var args = _.map(keys, function(key) {
    if (isValidKboxArg(key)) {
      return obj[key];
    } else {
      assert.fail(undefined, undefined, 'This should never happen!');
    }
  });
  return args;
};

/*
 * Apply/map an array of agument keys to a function.
 */
var applyArgs = function(mod, vals, args) {
  var mappedArgs = mapArgs(vals, args);
  return mod.apply(null, mappedArgs);
};

/*
 * Returns a module, that will at some later time have it's api
 * populated when needed dependencies are registered.
 */
var deferLoading = function(kbox, mod, args) {
  var api = {loaded: false};
  kbox.core.events.on('dep-registered', function(context, done) {
    if (context.key === 'app') {
      var vals = {
        app: context.val,
        kbox: kbox
      };
      _.assign(api, applyArgs(mod, vals, args), {loaded: true});
    }
    done();
  });
  return api;
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
var requireFromNodeModules = function(id) {
  var mod = null;
  try {
    mod = module.parent.parent.require(id);
  } catch (err) {
    if (!S(err.message).startsWith('Cannot find module')) {
      throw new KboxRequireError(id, err);
    }
  }
  return mod;
};

/*
 * A custom require that searches some directories for the
 * module to be loaded. Null is returned if the module cannot
 * be found.
 */
var requireFromOtherDirs = function(kbox, id) {
  // Use custom search to locate module.
  var filepathsToSearch = kbox.core.deps.call(function(globalConfig) {
    var dirs = [
      globalConfig.srcRoot,
      globalConfig.kalaboxRoot
    ];
    return _.map(dirs, function(dir) {
      return path.join(dir, 'plugins', id, 'index.js');
    });
  });
  var filepath = _.find(filepathsToSearch, fs.existsSync);
  if (filepath) {
    try {
      return require(filepath);
    } catch (err) {
      throw new KboxRequireError(filepath, err);
    }
  } else {
    return null;
  }
};

/*
 * The main guts of the module.
 */
var requireInternal = function(kbox, id) {
  // Validate kbox.
  if (typeof kbox !== 'object') {
    throw new TypeError('Invalid kbox object.');
  }
  // Validate id.
  if (typeof id !== 'string') {
    throw new TypeError('Invalid module id.');
  }

  // Try to load module from node_modules directory.
  var mod = requireFromNodeModules(id);

  if (!mod) {
    // Try to load module from other directories.
    mod = requireFromOtherDirs(kbox, id);
  }

  if (!mod) {
    // Module could not be loaded, throw an error.
    throw new Error('Cannot find module ' + id);
  } else {

    if (typeof mod === 'object') {

      // Nothing extra needs to be done, just return module.
      return mod;

    } else if (typeof mod === 'function') {

      if (mod.length === 0) {

        // No arguments, so just execute function and return.
        return mod();

      } else {

        // Argument names of the mod function.
        var args = inspect(mod);

        // Mod function has no arguments
        var hasNoArgs = args.length === 0;

        // Mod function only has arguments that are registered dependencies.
        var hasAllRegisteredArgs = (function() {
          var filteredArgs = _.filter(args, function(arg) {
            return isRegisteredArg(kbox, arg);
          });
          return filteredArgs.length === args.length;
        })();

        // Mod function only has arguments that are the NEW way of
        // loading modules.
        var hasAllKboxArgs = (function() {
          var filteredArgs = _.filter(args, isValidKboxArg);
          return filteredArgs.length === args.length;
        })();

        // Mod function uses the app dependency, which may NOT already be
        // known when this code runs.
        var hasAppArg = (function() {
          return _.find(args, function(arg) {
            return arg === 'app';
          });
        })();

        if (hasNoArgs) {

          // No arguments so just execute mod function and return results.
          try {
            return mod();
          } catch (err) {
            throw new KboxRequireError(id, err);
          }

        } else if (hasAllRegisteredArgs) {

          // Execute mod function with dependencies.
          try {
            return kbox.core.deps.call(mod);
          } catch (err) {
            throw new KboxRequireError(id, err);
          }

        } else if (hasAllKboxArgs) {

          if (hasAppArg) {

            // Execute mod function but do something a little different since
            // it needs the app dependency which might not be known/registered
            // yet.
            try {
              return deferLoading(kbox, mod, args);
            } catch (err) {
              throw new KboxRequireError(id, err);
            }

          } else {

            // Execute mod function and return results.
            try {
              return applyArgs(mod, {kbox: kbox}, args);
            } catch (err) {
              throw new KboxRequireError(id, err);
            }

          }

        } else {

          // We don't know how to init this module, throw an error.
          throw new Error('Module ' + id + ' is invalid!');

        }
      }

    } else {

      // This should never happen so assert fail if it does.
      assert.fail(undefined, undefined,
        'Required module expected to be either function or object');

    }

  }
};

/*
 * Load module and inject kalabox api into module.
 */
exports.require = function(kbox, id) {
  if (cache[id]) {
    // Return module from cache.
    return cache[id];
  } else {
    // Load module, store in cache, then return.
    var mod = requireInternal(kbox, id);
    if (typeof mod !== 'object') {
      mod = {};
    }
    cache[id] = mod;
    return mod;
  }
};
