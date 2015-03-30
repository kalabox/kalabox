'use strict';

/*
 * Kalabox framework module for events.
 */

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
    cb(app);
  } else {
    // Add listener
    self.addListener(name, priority, cb);
  }

};

EventEngine.prototype.emit = function(name, context, done) {
  var self = this;

  // Argument processing
  if ('function' === typeof context && done === undefined) {
    done = context;
    context = null;
  }

  logDebug('EVENTS => Emitting event (' + name + ')', context);

  // Callback needs to be set to something.
  if (done === undefined || done === null) {
    throw new Error('Event callback not set.');
  }

  var listeners = self.getListeners(name);
  var cbs = [];
  for (var i = _lowestPriority; i <= _highestPriority; i++) {
    listeners[i].forEach(function(cb) {
      cbs.push(cb);
    });
  }

  // Make sure event handler behave.
  if (cbs.length > 0) {
    var proxyCalled = false;
    var timer = null;
    var check = function() {
      timer = setTimeout(function() {
        if (!proxyCalled) {
          logInfo('Event handler has not called done.', cbs.toString());
          check();
        }
      }, 120 * 1000);
    };
    check();
    var doneProxy = function(err) {
      if (proxyCalled) {
        var err2 = new Error('Callback called more than once. ' +
          cbs.toString());
        logDebug('EVENTS => Error while dispatching event listeners.', err2);
        throw err2;
      }
      proxyCalled = true;
      if (timer !== null) {
        clearTimeout(timer);
      }

      if (err) {
        logDebug('EVENTS => Error while dispatching event listeners.', err.message);
      } else {
        logDebug('EVENTS => Finished dispatching event listeners.');
      }

      done(err);
    };
    self._dispatch(cbs, context, doneProxy);
  } else {
    logDebug('EVENTS => No listeners.', name);
    done(null);
  }
};

EventEngine.prototype._dispatch = function(cbs, context, done) {
  async.eachSeries(cbs, function(cb, next) {
    if (context) {
      cb(context, next);
    } else {
      cb(next);
    }
  },
  function(err) {
    if (err) {
      done(err);
    } else {
      done(null);
    }
  });
};

// Singleton instance
var _instance = null;
var getInstance = function() {
  if (!_instance) {
    _instance = new EventEngine();
  }
  return _instance;
};

var on = exports.on = function(name, priority, cb) {
  getInstance().on(name, priority, cb);
};

var emit = exports.emit = function(name, context, cb) {
  getInstance().emit(name, context, cb);
};
