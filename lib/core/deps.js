/**
 * @namespace: kbox.core.deps
 * Module for angularjs style dependency injection.
 * @module deps
 */

'use strict';

var FLAG_STRING = 'flag';

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

/**
 * Clears all registered dependencies.
 * @example
 * var deps = require(...);
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
 * var deps = require(...);
 * deps.register('key', 'value');
 * deps.remove('key');
 */
exports.remove = function(name) {
  _remove(name);
};

/**
 * Searches to find if a dependency exists.
 * @arg {string} name - Name of dependency.
 * @returns - True if dependency exists otherwise false.
 * @example
 * var deps = require(...);
 * if (!deps.contains('docker')) {
 *   deps.register('docker', new Docker(config));
 * }
 */
exports.contains = function(name) {
  var result = _getDep(name);
  return result !== undefined;
};

/**
 * Registers dependency for later access by other modules.
 * @arg {string} name - Name of dependency.
 * @arg dependency - Dependency to register.
 * @example
 * var deps = require(...);
 * deps.register('app', new App(config));
 */
exports.register = function(name, dep) {
  if (_getDep(name) !== undefined) {
    var msg =
      'Tried to register a dependency "' +
      name +
      '" that was already registered.';
    throw new Error(msg);
  }
  _setDep(name, dep);
};

/**
 * Looks up name of dependency and returns dependency.
 * @arg {string} name - Name of dependency.
 * @arg {object} [options] - Optional function behaivor.
 * @returns - Value of dependency or undefined if dependency does not exist.
 * @example
 * var deps = require(...);
 * var result = deps.lookup('mydepname', {optional:true});
 * if (result) {
 *   console.log(result);
 * }
 * @example
 * var deps = require(...);
 * try {
 *   var result = deps.lookup('mydepname');
 * } catch (err) {
 *   console.log('Dependency does not exist!');
 * }
 */
exports.lookup = function(name, opts) {
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
 * @arg {object} overrides - Object containing key value pairs of overrides.
 * @arg {function} callback - Callback function to be called to restore overrides.
 * @example
 * var deps = require('...');
 * assert(deps.lookup('mode') === 'prod');
 * deps.override({mode:test}, function(done) {
 *   assert(deps.lookup('mode') === 'test');
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
exports.inspect = inspect;

/**
 * Calls callback function with auto populated dependencies.
 * @arg {function} cb - callback function.
 * @example
 * var deps = require(...);
 * deps.call(function(app, flagVerbose) {
 *   if (flagVerbose) {
 *     console.log(app.name);
 *   }
 * });
 */
exports.call = function(cb) {
  var deps = this.inspect(cb).map(this.lookup);
  return cb.apply(cb, deps);
};
