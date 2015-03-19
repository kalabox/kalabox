'use strict';

/*
 * Root namespace for kalabox framework.
 */

var _self = this;

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

var share = require('./share.js');
exports.share = share;

var _require = require('./require.js');
exports.require = function(id, callback) {
  _require.require(_self, id, callback);
};
