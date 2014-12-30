'use strict';

/*
 * Kalabox core module.
 */

var config = require('./core/config.js');
module.exports.config = config;

var deps = require('./core/deps.js');
module.exports.deps = deps;

var env = require('./core/env.js');
module.exports.env = env;

var plugin = require('./core/plugin.js');
module.exports.plugin = plugin;
