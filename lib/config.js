'use strict';

var path = require('path');

// Retrieve static config
var config = require('../config.json');

config.platform = process.platform;

// Setup default Docker Host
if (!config.dockerHost) {
  config.dockerHost = config.platform === 'linux' ? '127.0.0.1' : '1.3.3.7';
}
// Setup default Dockerode params
if (!config.docker) {
  if (config.platform === 'linux') {
    config.docker = { socketPath: '/var/run/docker.sock' };
  }
  else {
    config.docker = {protocol:'http', host: '1.3.3.7', port: 2375};
  }
}
// Setup default redis params
if (!config.redis) {
  config.redis = {
    host: config.dockerHost,
    port: 6379
  };
}

// Add dynamic properties to config
config.baseDir = path.resolve(__dirname, '../');
config.homePath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
config.dataPath = path.resolve(config.homePath, '.kalabox');
config.appDataPath = path.resolve(config.dataPath, 'apps');

module.exports = config;
