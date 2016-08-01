'use strict';

var _ = require('lodash');
var platform = require('os').platform();
var rawConfig = require('./platform.json');

// findIndex callback to get platform
var getIndex = function(val) {
  return val === platform;
};

// map callback to set a specific platform config.
var getConfig = function(options, key, config) {
  return [key, key === 'index' ? config.index : options[config.index]];
};

// set index
rawConfig.index = _.findIndex(rawConfig.platform, getIndex);

// export a processed config
module.exports = _.object(_.map(rawConfig, getConfig));
