'use strict';

/**
 * Module for kalabox's shared asynchronous event engine.
 * @module kbox.core.events
 */

var Promise = require('../promise.js');
Promise.longStackTraces();

var _ = require('lodash');
var async = require('async');
var log = require('./log.js');
var deps = require('./deps.js');

var logDebug = log.debug;
var logInfo = log.info;

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

  logDebug('EVENTS => Emitting event (' + name + ')', context);

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
      logDebug('EVENTS => No listeners.', name);
      return null;
    } else {
      // Start dispatching.
      logDebug('EVENTS => Start dispatching event listeners.');
      return self._dispatch(cbs, context);
    }
  })
  // Log end of dispatching.
  .tap(function() {
    logDebug('EVENTS => Finished dispatching event listeners.');
  })
  // Log errors.
  .catch(function(err) {
    logDebug('EVENTS => Error while dispatching event listeners.', err);
    throw err;
  })
  // Return.
  .nodeify(done);

};

EventEngine.prototype._dispatch = function(cbs, context, done) {

  // Loop over for each callback.
  return Promise.resolve(cbs)
  .each(function(cb) {
    // Create a promisified function from node style callback function.
    var fn = Promise.promisify(cb);
    if (context) {
      // Call promisified function with a context.
      return fn(context);
    } else {
      // Call promisified function without a context.
      return fn();
    }
  })
  // Return.
  .nodeify(done);

};

// Singleton instance
var _instance = null;
var getInstance = function() {
  if (!_instance) {
    _instance = new EventEngine();
  }
  return _instance;
};

/**
 * Register a callback to listen to an event.
 * @static
 * @method
 * @arg {string} name - Name of the event to listen in on.
 * @arg {number} priority [optional] - Optional priority value. Lower priority
 *   callbacks are executed first. The default value is 5.
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
