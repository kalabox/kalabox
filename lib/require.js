'use strict';

var _ = require('lodash');

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

exports.require = function(kbox, id) {
  if (typeof id !== 'string') {
    throw new TypeError('Invalid module id.');
  }

  // @todo: do some sort of mapping on id to find modules in differnt dirs.

  var mod = module.parent.parent.require(id);
  if (typeof mod === 'function') {
    // Module returned a function.
    if (mod.length === 0) {
      return mod;
    } else {
      /*
       * Map name of arguments in module's build function to an object. If any
       * of the arguments doesn't fit what is expected then just return the
       * module's build function.
       * If all is good then return the result of the module's build function.
       */
      var args = _.reduce(inspect(mod), function(acc, arg) {
        if (acc === null) {
          // An argument has already not been found so just stop mapping.
          return null;
        } else {
          if (arg === 'kbox') {
            acc.push(kbox);
            return acc;
          } else if (arg === 'app') {
            var app = kbox.core.deps.lookup(arg, {optional:true});
            if (app) {
              // App is known so map it.
              acc.push(app);
              return acc;
            } else {
              // App is not known.
              return null;
            }
          } else {
            // An unknown argument.
            return null;
          }
        }
      }, []);
      // Return either module build function result or the module.
      if (args) {
        return mod.apply(null, args);
      } else {
        return mod;
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
