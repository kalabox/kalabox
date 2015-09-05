'use strict';

/**
 * Root namespace for kalabox framework.
 * @module kbox
 */

var _ = require('lodash');

// Keep reference for later.
var _self = this;

// Promise library.
var Promise = exports.Promise = require('./promise.js');
Promise.longStackTraces();

// App module.
var app = exports.app = require('./app.js');

// Art module.
exports.art = require('./art.js');

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

  /*
   * @todo: @bcauldwell this function should be deprecated.
   */

  // Validate.
  if (typeof cb !== 'function') {
    throw new Error('Invalid callback function: ' + cb);
  }

  if (cb.length === 1) {

    // Callback is not asynchronous.
    core.events.on('app-registered-new', function(ctx, done) {
      cb(ctx.app);
      done();
    });

  } else if (cb.length === 2) {

    // Callback is asynchronous.
    core.events.on('app-registered-new', cb);

  } else {

    // This should never happen so throw an error.
    throw new Error('Invalid function signature: ' + cb.toString());

  }

};

/*
 * Executes callback function whenever the app dependency is registerd.
 * @todo: document.
 */
exports.whenAppRegistered = function(cb) {

  var fn = function(ctx) {

    if (cb.length === 1) {

      return Promise.resolve(cb(ctx.app));

    } else if (cb.length === 2) {

      return Promise.fromNode(function(done) {
        cb(ctx.app, done);
      });

    } else {

      // This should never happen so throw an error.
      throw new Error('Invalid function signature: ' + cb.toString());

    }

  };

  // Subscribe to app registered event.
  core.events.on('app-registered-new', fn);

  if (core.deps.contains('app')) {
    var ctx = {
      app: core.deps.get('app')
    };
    return fn(ctx);
  }

};

/*
 * Executes callback function whenever the app dependency is unregisterd.
 * @todo: document.
 */
exports.whenAppUnregistered = function(cb) {

  // Subscribe to app unregistered event.
  core.events.on('app-unregistered-new', function(ctx, done) {

    if (cb.length === 1) {

      // Treat callback function synchronously.
      cb(ctx.app);
      done();

    } else if (cb.length === 2) {

      // Treat callback function asynchronously.
      cb(ctx.app, done);

    } else {

      // This should never happen so throw an error.
      throw new Error('Invalid function signature: ' + cb.toString());

    }

  });

};

/*
 * Execute callback function if an app context dependency exists.
 * @todo: document.
 */
exports.ifApp = function(cb) {

  return Promise.try(function() {

    if (core.deps.contains('app')) {

      var app = core.deps.get('app');

      if (cb.length === 1) {

        // Callback function should be treated synchronously.
        return cb(app);

      } else if (cb.length === 2) {

        // Callback function should be treated asynchronously.
        return Promise.fromNode(function(done) {
          cb(app, done);
        });

      } else {

        // This should never happen so throw an error.
        throw new Error('Invalid function signature: ' + cb.toString());

      }

    }

  });

};

/*
 * Set the app context and app related dependencies.
 * @todo: document.
 */
exports.setAppContext = function(newApp, done) {

  // Unregister old dependencies.
  return Promise.try(function() {
    // Remove app dependency.
    if (core.deps.contains('app')) {
      var oldApp = core.deps.get('app');
      core.deps.remove('app');
      return core.events.emit('app-unregistered-new', {app: oldApp});
    }
  })

  // Remove appConfig dependency.
  .then(function() {
    if (core.deps.contains('appConfig')) {
      core.deps.remove('appConfig');
    }
  })

  // Register new dependencies.
  .then(function() {
    core.deps.register('app', newApp);
    core.deps.register('appConfig', newApp.config);
  })

  // Load app plugins.
  .then(function() {
    return app.loadPlugins(newApp);
  })

  // Emit app registered event.
  .then(function() {
    return core.events.emit('app-registered-new', {app: newApp});
  })

  // Return.
  .nodeify(done);

};
