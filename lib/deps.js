/**
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

/**
 * Clears all registered dependencies.
 * @example
 * var deps = require(...);
 * deps.register('foo', 'bar');
 * assert(deps.contains('foo'));
 * deps.clear();
 * assert(!deps.contains('foo'));
 */
module.exports.clear = function() {
  _clear();
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
module.exports.contains = function(name) {
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
module.exports.register = function(name, dep) {
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
module.exports.lookup = function(name, opts) {
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

module.exports.getFlags = function() {
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
module.exports.call = function(cb) {
  var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
  var text = cb.toString();
  var trim = function(v) { return v.trim(); };
  var args = text.match(FN_ARGS)[1].split(',').map(trim);

  cb.apply(cb, args.map(this.lookup));
};
