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
  if (typeof callback !== 'function') {
    throw new TypeError('Invalid callback function: ' + callback);
  }
  if (typeof id !== 'string') {
    callback(new TypeError('Invalid require id: ' + id));
  }

  _require.require(_self, id, callback);
};

exports.whenApp = function(cb) {
  core.events.on('app-registered', cb);
};
