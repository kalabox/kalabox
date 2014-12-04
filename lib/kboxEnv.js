'use strict';

var path = require('path');

// Constants
var PLATFORM_WINDOWS = 'win32';
var ENV_KEY_HOME_WINDOWS = 'USERPROFILE';
var ENV_KEY_HOME_UNIX = 'HOME';

module.exports.platform = process.platform;

module.exports.getHomeDir = function() {
  var platformIsWindows = this.platform === PLATFORM_WINDOWS;
  var envKey = platformIsWindows ? ENV_KEY_HOME_WINDOWS : ENV_KEY_HOME_UNIX;
  return process.env[envKey];
};

module.exports.getKalaboxRoot = function() {
  return path.join(this.getHomeDir(), 'kalabox');
};
