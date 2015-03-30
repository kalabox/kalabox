/**
 * Module to abstract runnable tasks with error context wrapping and timeouts.
 * @module kbox.task
 */

'use strict';

var DEFAULT_TIMEOUT = 30 * 1000;

var _ = require('lodash');

/**
 * Constructor for Task class.
 * @class
 * @arg {string} description - Name or description of task.
 * @arg {number} timeout [default=30,000] - Timeout in milliseconds.
 * @arg {function} cmd - The task to run.
 */
function Task(description, timeoutDuration, cmd) {
  this._description = description;
  if (typeof cmd === 'undefined') {
    cmd = timeoutDuration;
    timeoutDuration = DEFAULT_TIMEOUT;
  }
  if (typeof cmd !== 'function') {
    var msg1 = 'Command passed to task [' + cmd + '] is not a function.';
    var err1 = this._wrapError(new Error(msg1));
    throw err1;
  }
  if (typeof timeoutDuration !== 'number') {
    var msg2 =
      'Timeout passed to task [' +
      timeoutDuration +
      '] is not a number.';
    var err2 = this._wrapError(new Error(msg2));
    throw err2;
  }
  this._cmd = cmd;
  this._timeoutDuration = timeoutDuration;
}

/**
 * Gets the task description.
 * @returns {string} description
 */
Task.prototype.getDescription = function() {
  return this._description;
};

/**
 * Gets the task timeout duration.
 * @returns {number} timeout duration
 */
Task.prototype.getTimeout = function() {
  return this._timeoutDuration;
};

/**
 * Sets the task timeout duration.
 * @arg {number} timeout duration
 */
Task.prototype.setTimeout = function(timeoutDuration) {
  this._timeoutDuration = timeoutDuration;
};

/**
 * Gets the task command function.
 * @returns {function} command function
 */
Task.prototype.getCommand = function() {
  return this._cmd;
};

Task.prototype._wrapError = function(err) {
  return err;
  //var context = 'While running task [' + this._description + ']';
  //return new Error(context + ' ' + err);
};

/*Task.prototype._wrapError = function(err) {
  var context = 'While running task [' + this._description + ']';
  return new Error(context + ' ' + err);
};*/

/**
 * Run the task command function.
 * @arg {function} callback - Function to be called back after task is complete.
 * @example
 * var Task = require(...);
 *
 * var cmd = function(done) {
 *   // Do some stuff.
 *   // The done() function MUST to be called so the task timeout can be canceled.
 *   done();
 * };
 * var timeout = 15 * 1000; // 15 seconds
 * var task = new Task('mytask', timeout, cmd);
 *
 * // Run task with a callback.
 * task.run(function(err) {
 *   // Err will be a wrapped error with context info added.
 *   if (err) throw err
 * });
 *
 * // Or you can listen for callback events.
 * task.on('end', function() {
 *   console.log('Task is complete!');
 * });
 * task.on('error', function(err) {
 *   // Err will be a wrapped error with context info added.
 *   throw err
 * });
 * task.on('timeout', function(timeoutErr) {
 *   // Err will be a wrapped error with context info added.
 *   throw err
 * });
 * task.run();
 */
Task.prototype.run = function(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Invalid callback function: ' + callback);
  }

  var self = this;

  self._cmd(function(err) {

    if (Array.isArray(err)) {
      err = _.filter(err);
      if (err.length > 0) {
        callback(err[0]);
      } else {
        callback();
      }
    } else {
      callback(err);
    }

  });

};

/**
 * Registers a callback event.
 * @arg {string} eventName - (error|end|timeout)
 * @arg {function} callback - Callback function to be called on event
 */
Task.prototype.on = function(eventName, callback) {
  if (eventName === 'error') {
    this._cbError = callback;
  } else if (eventName === 'end') {
    this._cbEnd = callback;
  } else if (eventName === 'timeout')   {
    this._cbTimeout = callback;
  } else {
    throw new Error('Invalid event name "' + eventName + '".');
  }
};

module.exports = Task;
