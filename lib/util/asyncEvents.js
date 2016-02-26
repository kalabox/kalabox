'use strict';

// Node modules.
var events = require('events');
var util = require('util');

// NPM modules.
var Promise = require('bluebird');
var _ = require('lodash');

/*
 * @todo: Add a priority feature, sort listeners by priority so we can replace
 * core.events with an instance of this.
 */

/*
 * Constructor.
 */
function AsyncEvents() {
  if (this instanceof AsyncEvents) {
    events.EventEmitter.call(this);
  } else {
    return new AsyncEvents();
  }
}

/*
 * Inherit from event emitter.
 */
util.inherits(AsyncEvents, events.EventEmitter);

/*
 * Save reference to the original emit method.
 */
AsyncEvents.prototype.__emit = AsyncEvents.prototype.emit;

/*
 * Helper function that will always return a promise even if function is
 * synchronous and doesn't return a promise.
 */
function handle() {
  var args = _.toArray(arguments);
  var fn = args.shift();
  var result = fn.apply(this, args);
  if (result instanceof Promise) {
    return result;
  } else {
    return Promise.resolve(result);
  }
}

/*
 * Custom emit method, used to make emitting block until event handlers are
 * finished.
 * Returns a promise.
 */
AsyncEvents.prototype.emit = function() {
  var self = this;
  // Get args.
  var args = _.toArray(arguments);
  // Grab name of event from first argument.
  var name = args.shift();
  // Get list of listeners.
  var fns = this.listeners(name);
  // We want to run mapping function one element at a time.
  var opts = {
    concurrency: 1
  };
  // Make listener functions to a promise in series.
  return Promise.map(fns, function(fn) {a
    // Clone function arguments.
    var fnArgs = args.slice();
    // Add listener function to front of arguments.
    fnArgs.unshift(fn);
    // Apply function that calls the listener function and returns a promise.
    return handle.apply(self, fnArgs);
  }, opts)
  // Return true if event had listeners just like the original emit function.
  .return(!!fns.length);
};

/*
 * Export constructor.
 */
module.exports = AsyncEvents;
