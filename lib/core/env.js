'use strict';

/*
 * @namespace: kbox.core.env
 */

var path = require('path');

var _ = require('lodash');

// Constants
var PLATFORM_LINUX = 'linux';
var PLATFORM_MAC = 'darwin';
var PLATFORM_WINDOWS = 'win32';
var PLATFORMS = [
  PLATFORM_LINUX,
  PLATFORM_MAC,
  PLATFORM_WINDOWS
];
var ENV_HOME_WINDOWS = 'USERPROFILE';
var ENV_HOME_UNIX = 'HOME';
var KALABOX_DEV_VAR = 'KALABOX_DEV';
var KALABOX_ROOT_DIRNAME = 'kalabox';
var KALABOX_SYS_CONF_DIRNAME = '.kalabox';
var KALABOX_SYS_CONF_PROVIDER = '.provider';

exports.platform = process.platform;

function getEnv(key) {
  return process.env[key];
}

var setEnv = exports.setEnv = function(key, value) {
  process.env[key] = value;
};

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

exports.ifElseLinux = function(cbIf, cbElse) {
  if (this.platform === PLATFORMS.PLATFORM_LINUX) {
    return cbIf();
  } else {
    return cbElse();
  }
};

exports.getHomeDir = function() {
  var platformIsWindows = this.platform === PLATFORM_WINDOWS;
  var envKey = platformIsWindows ? ENV_HOME_WINDOWS : ENV_HOME_UNIX;
  return getEnv(envKey);
};

exports.getDevMode = function() {
  var devMode = (getEnv(KALABOX_DEV_VAR) === 'true') ? true : false;
  return devMode;
};

exports.getKalaboxRoot = function() {
  return path.join(this.getHomeDir(), KALABOX_ROOT_DIRNAME);
};

exports.getSysConfRoot = function() {
  return path.join(this.getHomeDir(), KALABOX_SYS_CONF_DIRNAME);
};

exports.getSysProviderRoot = function() {
  return path.join(
    this.getHomeDir(), KALABOX_SYS_CONF_DIRNAME, KALABOX_SYS_CONF_PROVIDER
  );
};

exports.getSourceRoot = function() {
  return path.resolve(__dirname, '../../');
};
