'use strict';

/**
 * Root namespace for kalabox framework.
 * @module kbox
 */

// Keep reference for later.
var _self = this;

// Promise library.
var Promise = exports.Promise = require('./promise.js');
Promise.longStackTraces();

// App module.
exports.app = require('./app.js');

// Core module.
var core = exports.core = require('./core.js');

// Create module.
exports.create = require('./create.js')();

// Engine module.
exports.engine = require('./engine.js');

// Global init module.
exports.init = require('./init.js');

// Install module.
exports.install = require('./install.js');

exports.metrics = require('./metrics.js');

// Services module.
exports.services = require('./services.js');

// Share module.
exports.share = require('./share.js');

// Tasks module.
exports.tasks = require('./core/tasks.js');

// Update module.
exports.update = require('./update.js');

// Util module.
exports.util = require('./util.js');

// Require module.
var requireInternal = require('./require.js');
exports.require = function(id, callback) {

  // Try to load module.
  return Promise.try(function() {

    // Validate id is a string.
    if (typeof id !== 'string') {
      throw new TypeError('Invalid require id: ' + id);
    }

    return requireInternal.require(_self, id);

  })
  // Return.
  .nodeify(callback);

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

    // Callback is not asynchronous.
    core.events.on('app-registered', function(app, done) {
      cb(app);
      done();
    });

  } else if (cb.length === 2) {

    // Callback is asynchronous.
    core.events.on('app-registered', cb);

  } else {

    // This should never happen so throw an error.
    throw new Error('Invalid function signature: ' + cb.toString());

  }

};
