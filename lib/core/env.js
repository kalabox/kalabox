'use strict';

/*
 * @namespace: kbox.core.env
 */

var path = require('path');

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
var KALABOX_ROOT_DIRNAME = 'kalabox';
var KALABOX_SYS_CONF_DIRNAME = '.kalabox';
var KALABOX_SYS_CONF_PROVIDER = '.provider';

exports.platform = process.platform;

function getEnv(key) {
  return process.env[key];
}

var setEnv = exports.setEnv = function setEnv(key, value) {
  process.env[key] = value;
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

