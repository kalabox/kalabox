/**
 * Module to handle the environment.
 *
 * @name env
 */

'use strict';

var path = require('path');
var _ = require('lodash');

// Constants
var ENV_HOME_WINDOWS = 'USERPROFILE';
var ENV_HOME_UNIX = 'HOME';
var KALABOX_SYS_CONF_DIRNAME = '.kalabox';

/**
 * Document
 */
exports.platform = process.platform;

function getEnv(key) {
  return process.env[key];
}

/**
 * Document
 * @memberof env
 */
var setEnv = exports.setEnv = function(key, value) {
  process.env[key] = value;
};

/**
 * Document
 */
exports.setEnvFromObj = function(data, identifier) {

  // Prefix our keys with proper namespaces
  var prefix = ['KALABOX'];

  // If we have an additional identifier then add it in
  if (identifier) {
    prefix.push(identifier.toUpperCase());
  }

  // Build our namespace
  var namespace = prefix.join('_');

  _.forEach(data, function(value, key) {
    var envVar = [namespace, _.snakeCase(key).toUpperCase()].join('_');
    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }
    setEnv(envVar, value);
  });
};

/**
 * Document
 */
exports.getHomeDir = function() {
  var platformIsWindows = this.platform === 'win32';
  var envKey = platformIsWindows ? ENV_HOME_WINDOWS : ENV_HOME_UNIX;
  return getEnv(envKey);
};

/**
 * Document
 */
exports.getUserConfRoot = function() {
  return path.join(this.getHomeDir(), KALABOX_SYS_CONF_DIRNAME);
};

/**
 * Document
 */
exports.getSysConfRoot = function() {
  if (process.platform === 'linux') {
    return '/' + path.join('usr', 'share', 'kalabox');
  }
  else {
    return path.join(this.getHomeDir(), KALABOX_SYS_CONF_DIRNAME);
  }
};

/**
 * Document
 */
exports.getSourceRoot = function() {
  return path.resolve(__dirname, '..', '..');
};
