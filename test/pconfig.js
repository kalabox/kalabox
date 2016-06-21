'use strict';

var _ = require('lodash'),
  platform = require('os').platform(),
  raw_config = require('./platform.json');

// findIndex callback to get platform
var getIndex = function(val) {
  return val === platform;
};

// map callback to set a specific platform config.
var getConfig = function(options, key, config) {
  return [key, key == 'index' ? config.index : options[config.index]];
};

// set index
raw_config.index = _.findIndex(raw_config.platform, getIndex);

// export a processed config
module.exports = _.object(_.map(raw_config, getConfig));
