'use strict';

/**
 * Root namespace for kalabox framework.
 * @module kbox
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

var create = require('./create.js');
exports.create = create();

var update = exports.update = require('./update.js');

var share = require('./share.js');
exports.share = share;

var tasks = exports.tasks = require('./core/tasks.js');

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

/**
 * Register a callback that only gets called when an app is loaded.
 * @arg {function} callback - Function that is called when an app is loaded.
 * @arg {object} callback.app - App object for the app that was loaded.
 * @arg {function} callback.done [optional] - Optional callback function for performing
 *   an asynchronous operation and then returning control back to kalabox.
 * @example
 *
 * // Not all kalabox commands will be run with an app loaded. If you need
 * // something to happen only when an app is loaded, kbox.whenApp is for you.
 *
 * kbox.whenApp(function(app, done) {
 *   myPlugin.doSomething(app, function(err, result) {
 *     if (err) {
 *       return done(err);
 *     }
 *     console.log(result);
 *     done();
 *   });
 * });
 */
exports.whenApp = function(cb) {

  // Validate.
  if (typeof cb !== 'function') {
    throw new Error('Invalid callback function: ' + cb);
  }

  if (cb.length === 1) {

    core.events.on('app-registered', function(app, done) {
      cb(app);
      done();
    });

  } else if (cb.length === 2) {

    core.events.on('app-registered', cb);

  } else {

    throw new Error('Invalid function signature: ' + cb.toString());

  }

};
