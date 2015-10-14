'use strict';

/**
 * Module for kalabox's shared asynchronous event engine.
 * @module kbox.core.events
 */

var Promise = require('../promise.js');
Promise.longStackTraces();

var _ = require('lodash');
var async = require('async');
var deps = require('./deps.js');
var format = require('util').format;
var assert = require('assert');
var VError = require('verror');

// Logging functions.
var log = require('./log.js').make('EVENTS');

var _lowestPriority = 0;
var _highestPriority = 9;

var _events = null;

var EventEngine = exports.EventEngine = function() {
  var self = this;
  self._events = {};
};

EventEngine.prototype.getListeners = function(name) {
  var self = this;
  if (!self._events[name]) {
    var priorities = [];
    for (var i = _lowestPriority; i <= _highestPriority; i++) {
      priorities.push([]);
    }
    self._events[name] = priorities;
  }
  return self._events[name];
};

EventEngine.prototype.addListener = function(name, priority, cb) {
  var self = this;

  var listeners = self.getListeners(name);
  listeners[priority].push(cb);
};

EventEngine.prototype.on = function(name, priority, cb) {
  // @todo: bcauldwell - See if we can promisify this function.
  var self = this;

  // Argument processing
  if ('function' === typeof priority) {
    cb = priority;
    priority = 5;
  }

  // Validate the priority given
  if (priority < _lowestPriority || priority > _highestPriority) {
    throw new Error('Invalid priority of ' + priority);
  }

  if (name === 'app-registered' && deps.contains('app')) {
    var app = deps.lookup('app');
    cb(app, function() {});
  } else {
    // Add listener
    self.addListener(name, priority, cb);
  }

};

EventEngine.prototype.emit = function(name, context, done) {

  var self = this;

  // Argument processing
  if (typeof context === 'function' && done === undefined) {
    done = context;
    context = null;
  }

  log.debug(format('Emitting event [%s].', name), context);

  var listeners = self.getListeners(name);
  var cbs = [];
  for (var i = _lowestPriority; i <= _highestPriority; i++) {
    listeners[i].forEach(function(cb) {
      cbs.push(cb);
    });
  }

  // @todo: bcauldwell - Add some sort of forked promise that can be
  // cancelled so that we can notify stdout when a callback doesn't
  // get called within a certain amount of time.

  // Dispatch callbacks.
  return Promise.try(function() {
    if (cbs.length === 0) {
      // No listeners, so no dispatching is needed.
      log.debug(format('No listeners [%s].', name));
      return null;
    } else {
      // Start dispatching.
      log.debug(format('Start dispatching event listeners [%s].', name));
      return self._dispatch(cbs, context);
    }
  })
  // Log end of dispatching.
  .tap(function() {
    log.debug(format('Finished dispatching event listeners [%s].', name));
  })
  // Wrap errors.
  .catch(function(err) {
    err = new VError(err, 'Error dispatching event listeners [%s]', name);
    log.debug(err.message);
    throw err;
  })
  // Return.
  .nodeify(done);

};

EventEngine.prototype._dispatch = function(cbs, context, done) {

  // Loop through each callback one at a time.
  return Promise.each(cbs, function(cb) {

    // Promisify and call the callback.
    return Promise.try(function() {

      /*
       * If cb returns a promise, the promise will be waited on, if cb
       * expects a callback function then it will get one, and that
       * callback function will be waited on.
       */

      if (context && cb.length === 1) {

        // Execute with context, could return a promise.
        return cb(context);

      } else if (context && cb.length === 2) {

        // Execute with context, expect a callback.
        return Promise.fromNode(function(next) {
          cb(context, next);
        });

      } else if (cb.length === 0) {

        // Execute, could return a promise.
        return cb();

      } else if (cb.length === 1) {

        // Execute, expect a callback.
        return Promise.fromNode(cb);

      } else {

        // This should never happen.
        assert(false);

      }

    });

  })
  // Make sure promise is resolved to undefined.
  .then(_.noop)
  // Return.
  .nodeify(done);

};

// Singleton instance
var getInstance = _.once(function() {
  return new EventEngine();
});

/**
 * Register a callback to listen to an event.
 * @static
 * @method
 * @arg {string} name - Name of the event to listen in on.
 * @arg {number} priority [optional] - Optional priority value. Lower priority
 *   callbacks are executed first. The default value is 5. From 0-9
 * @arg {function} callback - Callback called when the event is fired.
 * @arg callback.context [optional] - Optional context of the event.
 * @arg {function} callback.next - Callback function that must be called to
 *   return control back to the event engine and allow the next callback to
 *   be run. If the event generates an error, that error can be reported back
 *   to callback as an argument of the next callback. IT MUST BE CALLED!
 * @example
 * kbox.core.events.on('shields-status-change', function(status, next) {
 *   foo.asyncFunction(status, function(err) {
 *     next(err);
 *   })
 * });
 */
var on = exports.on = function(name, priority, cb) {
  getInstance().on(name, priority, cb);
};

/**
 * Fire off all registered listener callbacks for the named event in order of
 *   priority in an asynchronous series fashion.
 * @static
 * @method
 * @arg {string} name - Name of the event to fire off.
 * @arg context [optional] - Optional context to populate the listener
 *   callbacks with.
 * @arg {function} callback - Callback called when all listener callbacks
 *   have completed.
 * @arg {error} callback.error - Possible error returned by listener callbacks.
 * @example
 * var status = shields.up();
 * kbox.core.events.emit('shields-status-change', status, function(err) {
 *   if (err)  {
 *     throw err;
 *   }
 * });
 */
var emit = exports.emit = function(name, context, cb) {

  // Get singleton instance.
  return Promise.resolve(getInstance())
  // Call emit.
  .call('emit', name, context)
  // Return.
  .nodeify(cb);

};
