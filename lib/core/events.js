'use strict';

/*
 * Kalabox framework module for events.
 */

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
    for (var i=_lowestPriority; i<=_highestPriority; i++) {
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

  // Add listener
  self.addListener(name, priority, cb);
};

EventEngine.prototype.emit = function(name, context, done) {
  var self = this;
  
  // Argument processing
  if ('function' == typeof context && done === undefined) {
    done = context;
    context = null;
  }

  var listeners = self.getListeners(name);
  var cbs = [];
  for (var i=_lowestPriority; i<=_highestPriority; i++) {
    listeners[i].forEach(function(cb) {
      cbs.push(cb);
    });
  }

  if (cbs.length > 0) {
    self._dispatch(cbs, context, done);
  } else {
    done(null);
  }
};

EventEngine.prototype._dispatch = function(cbs, context, done) {
  var self = this;
  var rec = function(elts) {
    if (elts.length === 0) {
      done(null);
    } else {
      var hd = elts[0];
      var tl = elts.slice(1);
      var next = function(err) {
        if (err) {
          done(err);
        } else {
          rec(tl);
        }
      };
      if (context) {
        hd(context, next);
      } else {
        hd(next);
      }
    }
  };
  rec(cbs);
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
