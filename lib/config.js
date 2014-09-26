'use strict';

var path = require('path');

// Retrieve static config
var config = require('../config.json');

// Add dynamic properties to config
config.baseDir = path.resolve(__dirname, '../');
config.homePath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
config.dataPath = path.resolve(config.homePath, '.kalabox');
config.appDataPath = path.resolve(config.dataPath, 'apps');

module.exports = config;
