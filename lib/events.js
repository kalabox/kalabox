'use strict';

/*
 * Kalabox framework module for events.
 */

var AsyncEventEmitter = require('async-eventemitter');
var eventEmitter = new AsyncEventEmitter();

var on = function(evt, cb) {
  eventEmitter.on(evt, cb);
};
exports.on = on;

var emit = function(evt, data, cb) {
  eventEmitter.emit(evt, data, cb);
};
exports.emit = emit;
