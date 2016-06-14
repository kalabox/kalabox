'use strict';

// Node modules.
var util = require('util');

// NPM modules.
var _ = require('lodash');

// Kalabox modules.
var Promise = require('../promise.js');
var AsyncEvents = require('./asyncEvents.js');

/*
 * Default throttle calculation. (throttle = n per second)
 */
function defaultThrottle(size) {
  return size < 5 ? 1 : size;
}

/*
 * Constructor.
 */
function ThrottledEvents(opts) {
  if (this instanceof ThrottledEvents) {
    this.opts = opts || {
      throttle: defaultThrottle
    };
    this.throttle = this.opts.throttle || defaultThrottle;
    this.p = Promise.resolve();
    this.size = 0;
    AsyncEvents.call(this);
  } else {
    return new ThrottledEvents(opts);
  }
}

/*
 * Inherit from async events class.
 */
util.inherits(ThrottledEvents, AsyncEvents);

/*
 * Hold onto previous emit method.
 */
ThrottledEvents.prototype.__emit = ThrottledEvents.prototype.emit;

/*
 * Emit events with a throttle.
 */
ThrottledEvents.prototype.emit = function() {
  var self = this;
  // Get args to use.
  var args = _.toArray(arguments);
  // Increment size of promise chain.
  self.size += 1;
  // Use this to nodeify promise later.
  var done = null;
  // Create a result to return from this function.
  var result = Promise.fromNode(function(cb) {
    done = cb;
  });
  // Add to promise chain.
  self.p = self.p.then(function() {
    // Emit event.
    return self.__emit.apply(self, args);
  })
  // Delay based on throttle (throttle = n per second).
  .then(function() {
    var throttle = self.opts.throttle(self.size);
    var delay = 1000 / throttle;
    return Promise.delay(delay);
  })
  // Decrement promise chain size.
  .finally(function() {
    self.size -= 1;
  })
  // Signal the resolution of just this promise.
  .nodeify(done);
  // Return unresolved promise.
  return result;
};

/*
 * Export Constructor.
 */
module.exports = ThrottledEvents;
