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
var ENV_DOCKER_HOST = 'DOCKER_HOST';
var ENV_BOOT2DOCKER_PROFILE = 'BOOT2DOCKER_PROFILE';
var ENV_HOME_WINDOWS = 'USERPROFILE';
var ENV_HOME_UNIX = 'HOME';
var KALABOX_ROOT_DIRNAME = 'kalabox';

exports.platform = process.platform;

function getEnv(key) {
  return process.env[key];
}

function setEnv(key, value) {
  process.env[key] = value;
}

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

exports.getSourceRoot = function() {
  return path.resolve(__dirname, '../../');
};

exports.setDockerHost = function(value) {
  setEnv(ENV_DOCKER_HOST, value);
};

exports.getDockerHost = function() {
  getEnv(ENV_DOCKER_HOST);
};

exports.setB2dProf = function(value) {
  setEnv(ENV_BOOT2DOCKER_PROFILE, value);
};

exports.getB2dProf = function() {
  getEnv(ENV_BOOT2DOCKER_PROFILE);
};
