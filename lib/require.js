'use strict';

var S = require('string');
var _ = require('lodash');
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var cache = {};

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

var isRegisteredArg = function(kbox, key) {
  return kbox.core.deps.contains(key);
};

var validKboxArgs = ['kbox', 'app'];

var isValidKboxArg = function(key) {
  return _.contains(validKboxArgs, key);
};

var mapArgs = function(vals, keys) {
  var args = _.map(keys, function(key) {
    if (isValidKboxArg(key)) {
      return vals[key];
    } else {
      assert.fail(undefined, undefined, 'This should never happen!');
    }
  });
  return args;
};

var applyArgs = function(mod, vals, args) {
  var mappedArgs = mapArgs(vals, args);
  return mod.apply(null, mappedArgs);
};

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

var requireFromNodeModules = function(id) {
  var mod = null;
  try {
    mod = module.parent.parent.require(id);
  } catch (err) {
    if (!S(err.message).startsWith('Cannot find module')) {
      throw err;
    }
  }
  return mod;
};

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
    return require(filepath);
  } else {
    return null;
  }
};

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

        var args = inspect(mod);
        var hasNoArgs = args.length === 0;
        var hasAllRegisteredArgs = (function() {
          var filteredArgs = _.filter(args, function(arg) {
            return isRegisteredArg(kbox, arg);
          });
          return filteredArgs.length === args.length;
        })();
        var hasAllKboxArgs = (function() {
          var filteredArgs = _.filter(args, isValidKboxArg);
          return filteredArgs.length === args.length;
        })();
        var hasAppArg = (function() {
          return _.find(args, function(arg) {
            return arg === 'app';
          });
        })();
        if (hasNoArgs) {
          return mod;
        } else if (hasAllRegisteredArgs) {
          return kbox.core.deps.call(mod);
        } else if (hasAllKboxArgs) {
          if (hasAppArg) {
            return deferLoading(kbox, mod, args);
          } else {
            return applyArgs(mod, {kbox: kbox}, args);
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

exports.require = function(kbox, id) {
  if (cache[id]) {
    return cache.id;
  } else {
    var mod = requireInternal(kbox, id);
    if (typeof mod !== 'object') {
      mod = {};
    }
    cache.id = mod;
    return mod;
  }
};
