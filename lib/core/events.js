'use strict';

/**
 * Module for kalabox's shared asynchronous event engine.
 */

var Promise = require('../promise.js');

var _ = require('lodash');
var deps = require('./deps.js');
var format = require('util').format;
var assert = require('assert');
var VError = require('verror');
var uuid = require('uuid');

// Logging functions.
var log = require('./log.js').make('EVENTS');

var _lowestPriority = 0;
var _highestPriority = 9;

/*
 * Event engine constructor.
 */
var EventEngine = exports.EventEngine = function() {
  this._events = {};
};

/*
 * Remove listener if it isn't in the default event context.
 */
EventEngine.prototype.removeListener = function(name, context) {
  var self = this;

  // Make sure undefined context is set to default.
  if (context === undefined) {
    context = 'default';
  }

  // If the event key exists and the context is not default.
  if (self._events[name] && context !== 'default') {
    // Filter out listeners with the same context.
    self._events[name] = _.filter(self._events[name], function(listener) {
      return listener.context !== context;
    });
  }
};

/*
 * Add listener.
 */
EventEngine.prototype.addListener = function(name, context, priority, cb) {
  var self = this;

  // Remove previous listeners with the same context.
  self.removeListener(name, context);

  // Initialize slot if it's hasn't already been.
  if (!self._events[name]) {
    self._events[name] = [];
  }

  // Add listener to array.
  self._events[name].push({
    context: context,
    priority: priority,
    fn: cb
  });
};

/*
 * Setup a new event listener.
 */
EventEngine.prototype.on = function(name, context, priority, cb) {
  var self = this;

  // Argument processing
  if (typeof context === 'function') {
    cb = context;
    priority = 5;
    context = 'default';
  } else if (typeof priority === 'function') {
    cb = priority;
    if (typeof context === 'number') {
      priority = context;
    } else {
      priority = 5;
    }
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
    self.addListener(name, context, priority, cb);
  }

};

/*
 * Emit an event.
 */
EventEngine.prototype.emit = function(name, state, done) {

  var self = this;

  // Argument processing
  if (typeof state === 'function' && done === undefined) {
    done = state;
    state = null;
  }

  log.debug(format('Emitting event [%s].', name), state);

  // Get an array of listeners sorted by priority.
  var listeners = self._events[name];
  var cbs = _.sortBy(listeners, function(listener) {
    return listener.priority;
  });

  // Dispatch callbacks.
  return Promise.try(function() {
    if (cbs.length === 0) {
      // No listeners, so no dispatching is needed.
      log.debug(format('No listeners [%s].', name));
      return null;
    } else {
      // Start dispatching.
      log.debug(format('Start dispatching event listeners [%s].', name));
      return self._dispatch(cbs, state);
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

EventEngine.prototype._dispatch = function(cbs, state, done) {

  // Loop through each callback one at a time.
  return Promise.each(cbs, function(cb) {

    // Promisify and call the callback.
    return Promise.try(function() {

      /*
       * If cb returns a promise, the promise will be waited on, if cb
       * expects a callback function then it will get one, and that
       * callback function will be waited on.
       */

      if (state && cb.fn.length === 1) {

        // Execute with state, could return a promise.
        return cb.fn(state);

      } else if (state && cb.fn.length === 2) {

        // Execute with state, expect a callback.
        return Promise.fromNode(function(next) {
          cb.fn(state, next);
        });

      } else if (cb.fn.length === 0) {

        // Execute, could return a promise.
        return cb.fn();

      } else if (cb.fn.length === 1) {

        // Execute, expect a callback.
        return Promise.fromNode(cb.fn);

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
exports.on = function(name, priority, cb) {
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
exports.emit = function(name, state, cb) {

  // Get singleton instance.
  return Promise.resolve(getInstance())
  // Call emit.
  .call('emit', name, state)
  // Return.
  .nodeify(cb);

};

/*
 * Event context constructor.
 */
function EventContext(id) {
  if (id === undefined) {
    // Get uuid for context.
    this.id = uuid.v1();
  } else {
    this.id = id;
  }
}

/*
 * Add an event listener with this event context's unique id.
 */
EventContext.prototype.on = function(name, priority, fn) {
  var self = this;
  getInstance().on(name, self.id, priority, fn);
};

/*
 * Emit an event.
 */
EventContext.prototype.emit = function(name, state, cb) {
  // Get singleton instance.
  return Promise.resolve(getInstance())
  // Call emit.
  .call('emit', name, state)
  // Return.
  .nodeify(cb);
};

/*
 * Returns a new event context object.
 */
exports.context = function() {
  return new EventContext();
};
