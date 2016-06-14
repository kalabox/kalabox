/**
 * Module for Kalabox dependency injection.
 *
 * @name deps
 */

'use strict';

var FLAG_STRING = 'flag';

var _ = require('lodash');
var events = require('./events.js');

var _deps = {};

function _getDep(name) {
  return _deps[name];
}

function _setDep(name, value) {
  _deps[name] = value;
}

function _clear() {
  _deps = {};
}

function _remove(name) {
  delete _deps[name];
}

/*
 * Document this
 */
exports.keys = function() {
  return _.keys(_deps);
};

/**
 * Clears all registered dependencies.
 * @example
 * var deps = kbox.core.deps;
 * deps.register('foo', 'bar');
 * assert(deps.contains('foo'));
 * deps.clear();
 * assert(!deps.contains('foo'));
 */
exports.clear = function() {
  _clear();
};

/**
 * Removes a given dependency.
 * @arg {string} name - Name of dependency to remove.
 * @example
 * var deps = kbox.core.deps;
 * deps.register('key', 'value');
 * deps.remove('key');
 */
exports.remove = function(name) {
  _remove(name);
};

/**
 * Searches to find if a dependency exists.
 * @memberof deps
 * @static
 * @method
 * @arg {string} name - Name of dependency.
 * @returns - True if dependency exists otherwise false.
 * @example
 * var deps = kbox.core.deps;
 * if (!deps.contains('lunch')) {
 *   deps.register('lunch', new MeatballSandwich({extraSauce: true}));
 * }
 */
var contains = exports.contains = function(name) {
  var result = _getDep(name);
  return result !== undefined;
};

/**
 * Registers dependency for later access by other modules.
 * @memberof deps
 * @static
 * @method
 * @arg {string} name - Name of dependency.
 * @arg dependency - Dependency to register.
 * @example
 * kbox.core.deps.register('dinner', new Steak({style: mediumWell}));
 */
var register = exports.register = function(name, dep, done) {
  if (!done) {
    done = function() {};
  }

  if (_getDep(name) !== undefined) {
    var msg =
      'Tried to register a dependency "' +
      name +
      '" that was already registered.';
    throw new Error(msg);
  }
  _setDep(name, dep);
  if (name === 'app') {
    events.emit('dep-registered', {key:name, val:dep}, done);
  } else {
    done();
  }
};

/**
 * Registers a dependency if it is not already registered.
 * @arg {string} name - Name of dependency.
 * @arg dependency - Dependency to register.
 * @example
 * kbox.core.deps.registerIf('shieldGeneratorLocation', location);
 */
exports.registerIf = function(name, dep) {
  if (!contains(name)) {
    register(name, dep);
  }
};

/**
 * Looks up name of dependency and returns dependency.
 * @memberof deps
 * @arg {string} name - Name of dependency.
 * @arg {Object} [options] - Optional function behaivor.
 * @returns - Value of dependency or null if dependency does not exist.
 * @example
 * var result = kbox.core.deps.lookup('mydepname', {optional:true});
 * if (result) {
 *   console.log(result);
 * }
 * @example
 * try {
 *   var result = kbox.core.deps.lookup('mydepname');
 * } catch (err) {
 *   console.log('Dependency does not exist!');
 * }
 */
exports.lookup = exports.get = function(name, opts) {
  var result = _getDep(name);
  if (result !== undefined) {
    return result;
  } else if (opts && opts.optional && opts.optional === true) {
    return null;
  } else {
    throw new Error('The dependency "' + name + '" was NOT found!');
  }
};

function _isFlag(name) {
  return (name.substr(0, FLAG_STRING.length) === FLAG_STRING);
}

/**
 * Document
 */
exports.getFlags = function() {
  var flags = {};
  for (var dep in _deps) {
    if (_isFlag(dep)) {
      var firstLetter = dep.substr(FLAG_STRING.length, 1);
      var theRest = dep.substring(FLAG_STRING.length + 1);
      var key = firstLetter.toLowerCase() + theRest;
      flags[key] = _deps[dep];
    }
  }
  return flags;
};

/**
 * Overrides given dependencies with given values for the duration of callback.
 * @arg {Object} overrides - Object containing key value pairs of overrides.
 * @arg {function} callback - Callback function to be called to restore overrides.
 * @example
 * var deps = kbox.core.deps;
 * assert(deps.lookup('foo') === 'prod');
 * deps.override({foo:test}, function(done) {
 *   assert(deps.lookup('foo') === 'test');
 * });
 */
exports.override = function(overrides, callback) {
  var savedValues = {};
  // Save current deps to be restored later.
  for (var key in overrides) {
    savedValues[key] = _deps[key];
    _deps[key] = overrides[key];
  }
  // When callback is done with overrides, restore deps.
  callback(function() {
    // Restore deps.
    for (var key in overrides) {
      _deps[key] = savedValues[key];
    }
  });
};

exports.inspect = function(cb) {
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

/**
 * Calls callback function with auto populated dependencies.
 * @arg {function} cb - callback function.
 * @example
 * kbox.core.deps.call(function(app, globalConfig, deathStarPlan, javaTheHut) {
 *   console.log(app.name);
 *   .......
 * });
 */
exports.call = function(cb) {
  var deps = this.inspect(cb).map(this.lookup);
  return cb.apply(cb, deps);
};
