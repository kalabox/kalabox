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
exports.app = require('./app.js');

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
exports.require = function(id, app, callback) {

  if (typeof callback === 'undefined' && typeof app === 'function') {
    callback = app;
    app = undefined;
  }

  // Try to load module.
  return Promise.try(function() {

    // Validate id is a string.
    if (typeof id !== 'string') {
      throw new TypeError('Invalid require id: ' + id);
    }

    var requireInternal = require('./require.js');
    return requireInternal.require(module, _self, id, app);

  })
  // Return.
  .nodeify(callback);

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

/**
 * Proxy method to forward a deprecated method to the new one.
 */
exports.status = {
  update: function() {
    var args = _.toArray(arguments);
    return core.log.status.apply(null, args);
  }
};
