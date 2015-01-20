'use strict';

/*
 * Root namespace for kalabox framework.
 */

var app = require('./app.js');
exports.app = app;

var core = require('./core.js');
exports.core = core;

var engine = require('./engine.js');
exports.engine = engine;

var services = require('./services.js');
exports.services = services;

var util = require('./util.js');
exports.util = util;

var install = require('./install.js');
exports.install = install;
