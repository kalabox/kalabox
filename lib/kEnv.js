'use strict';

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

module.exports.platform = process.platform;

module.exports.getHomeDir = function() {
  var platformIsWindows = this.platform === PLATFORM_WINDOWS;
  var envKey = platformIsWindows ? ENV_HOME_WINDOWS : ENV_HOME_UNIX;
  return process.env[envKey];
};

module.exports.getKalaboxRoot = function() {
  return path.join(this.getHomeDir(), KALABOX_ROOT_DIRNAME);
};
