/**
 * This is the top level namespace for all other kalabox things
 *
 * @name kbox
 */

'use strict';

var _ = require('lodash');

// Keep reference for later.
var _self = this;

/**
 * Contains core promises stuff for Kalabox.
 *
 * [Read more](#promise)
 * @memberof kbox
 */
var Promise = exports.Promise = require('./promise.js');
Promise.longStackTraces();

/**
 * Contains core app things for Kalabox.
 *
 * [Read more](#app)
 * @memberof kbox
 */
var app = exports.app = require('./app.js');

/**
 * Contains beatufiul artwork for Kalabox.
 *
 * [Read more](#art)
 */
exports.art = require('./art.js');

/**
 * Contains core functionality for Kalabox.
 *
 * [Read more](#core)
 * @memberof kbox
 */
var core = exports.core = require('./core.js');

/**
 * Contains app create framework for Kalabox
 *
 * [Read more](#create)
 * @memberof kbox
 */
exports.create = require('./create.js')();

/**
 * Contains engine interface for Kalabox.
 *
 * [Read more](#engine)
 */
exports.engine = require('./engine.js');

/**
 * Contains init sequence for Kalabox
 *
 * [Read more](#init)
 */
exports.init = require('./init.js');

/**
 * Contains install framework for Kalabox
 *
 * [Read more](#install)
 */
exports.install = require('./install.js');

/**
 * Contains integration framework for Kalabox
 *
 * [Read more](#integrations)
 */
exports.integrations = require('./integrations.js')();

/**
 * Contains metrics code for Kalabox
 *
 * [Read more](#metrics)
 */
exports.metrics = require('./metrics.js');

/**
 * Contains task framework for Kalabox.
 *
 * [Read more](#tasks)
 */
exports.tasks = require('./core/tasks.js');

/**
 * Contains util methods for Kalabox
 *
 * [Read more](#util)
 */
exports.util = require('./util.js');

/**
 * Contains require stuff for Kalabox
 *
 * [Read more](#require)
 */
exports.require = function(id, callback) {

  // Try to load module.
  return Promise.try(function() {

    // Validate id is a string.
    if (typeof id !== 'string') {
      throw new TypeError('Invalid require id: ' + id);
    }

    var requireInternal = require('./require.js');
    return requireInternal.require(module, _self, id);

  })
  // Return.
  .nodeify(callback);

};

/**
 * Executes callback function whenever the app dependency is registerd.
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

/**
 * Executes callback function whenever the app dependency is unregisterd.
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

/**
 * Execute callback function if an app context dependency exists.
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

/**
 * Set the app context and app related dependencies.
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

  // Register new dependencies and add an entry to the appRegistry if needed
  .then(function() {
    core.deps.register('app', newApp);
    core.deps.register('appConfig', newApp.config);
    return app.register({name: newApp.name, dir: newApp.config.appRoot});
  })

  // Load app plugins.
  .then(function() {
    return app.loadPlugins(newApp);
  })

  // Add our app configs to the ENV
  .then(function() {

    // Add the app config
    core.env.setEnvFromObj(core.deps.get('appConfig'), 'app_config');

    // Remove some redundant/confusing things
    var appEnv = _.clone(core.deps.get('app'));
    delete(appEnv.config);
    core.env.setEnvFromObj(appEnv, 'app');

  })

  // Emit app registered event.
  .then(function() {
    return core.events.emit('app-registered-new', {app: newApp});
  })

  // Return.
  .nodeify(done);

};

/**
 * Returns stack trace string of an error.
 */
exports.getStackTrace = function(err) {

  if (!err instanceof Error) {
    throw new Error('Object is not an error: ' + err);
  }

  /*jshint camelcase: false */
  /*jscs: disable */
  if (err.jse_cause && err.jse_cause.stack) {
    return err.jse_cause.stack;
  } else {
    return err.stack;
  }
  /*jshint camelcase: true */
  /*jscs: enable */

};

/**
 * Small object for adding and getting error tags.
 */
exports.errorTags = {
  add: function(err, tag) {
    if (err instanceof Error) {
      if (!err.tags) {
        err.tags = [];
      }
      err.tags.push(tag);
      err.tags = _.uniq(err.tags);
    }
  },
  get: function(err) {
    if (!err.tags) {
      return [] ;
    } else {
      return err.tags;
    }
  }
};
