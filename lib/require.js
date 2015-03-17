'use strict';

var _ = require('lodash');
var S = require('string');
var path = require('path');
var fs = require('fs');

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

var resolve = exports.resolve = function(kbox, id) {
  // Use node require.resolve to locate module.
  var filepath = null;
  try {
    filepath = require.resolve(id);
  } catch (err) {
    if (!S(err.message).startsWith('Cannot find module')) {
      throw err;
    }
  }

  if (filepath) {
    return filepath;
  } else {
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
    filepath = _.find(filepathsToSearch, fs.existsSync);
    if (filepath) {
      return filepath;
    } else {
      throw new Error('Module "' + id + '" could not be found.');
    }
  }
};

exports.require = function(kbox, id) {
  if (typeof id !== 'string') {
    throw new TypeError('Invalid module id.');
  }

  var mod = module.parent.parent.require(resolve(kbox, id));
  if (typeof mod === 'function') {
    // Module returned a function.
    if (mod.length === 0) {
      // No kbox specific args, so just return mod.
      return mod;
    } else {
      var args = inspect(mod);
      if (args.length === 0) {
        // No args so return mod function.
        return mod;
      } else {
        var kboxArgs = _.filter(args, isValidKboxArg);
        if (args.length === kboxArgs.length) {
          var usesApp = _.find(args, function(arg) {
            return arg === 'app';
          });
          if (usesApp) {
            // Defer mod function execution until deferred args are resolved.
            return deferLoading(kbox, mod, args) ;
          } else {
            // Execute mod function and return module.
            var vals = {
              kbox: kbox
            };
            return applyArgs(mod, vals, args);
          }
        } else {
          return mod;
        }
      }
    }
  } else if (typeof mod === 'object') {
    // Module returned an object.
    return mod;
  } else {
    // This should never happen so assert fail if it does.
    assert.fail(undefined, undefined,
      'Required module expected to be either function or object');
  }
};
