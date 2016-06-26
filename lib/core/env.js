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

// Npm modules
var shell = require('sync-exec');

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

  // Return sysConfRoot based on path
  switch (process.platform) {
    case 'win32': return path.join(this.getHomeDir(), KALABOX_SYS_CONF_DIRNAME);
    case 'darwin': return '/Applications/Kalabox.app/Contents/MacOS';
    case 'linux': return '/usr/share/kalabox';
  }

};

/**
 * Document
 */
exports.getSourceRoot = function() {
  return path.resolve(__dirname, '..', '..');
};

/**
 * Document
 */
exports.getEngineUserId = function() {
  if (process.platform !== 'linux') {
    return 1000;
  }
  else {
    var id = shell('id -u $(whoami)', {silent:true});
    if (id.status !== 0) {
      throw new Error('Cant get users id');
    }
    else {
      return _.trim(id.stdout);
    }
  }
};

/**
 * Document
 */
exports.getEngineUserGid = function() {
  if (process.platform !== 'linux') {
    return 50;
  }
  else {
    var group = shell('id -g', {silent:true});
    if (group.status !== 0) {
      throw new Error('Cant get users gid');
    }
    else {
      return _.trim(group.stdout);
    }
  }
};
