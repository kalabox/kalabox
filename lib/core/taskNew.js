'use strict';

var _ = require('lodash');

var tasks = null;

var addTask = function(task) {
  throw new Error('Not implemented.');
};

var clearTasks = exports.clearTasks = function() {
  throw new Error('Not implemented.');
};

var blueprint = {
  path: null,
  description: null,
  options: [],
  func: null,
  __isTask: true
};

var invariant = function(task) {
  throw new Error('Not implemented.');
};

var cloneBlueprint = function() {
  return _.cloneDeep(blueprint);
};

var registerTask = exports.registerTask = function(handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('Invalid task registration handler: ' + handler);
  }

  var task = cloneBlueprint();
  if (handler.length === 1) {

    handler(task);
    invariant(task);
    addTask(task);

  } else if (handler.length === 2) {

    var timeout = setTimeout(function() {
      throw new Error('Task registration done callback was not called: ' +
        task.path);
    }, 2 * 60 * 1000);

    handler(task, function() {
      clearTimeout(timeout);
      invariant(task);
      addTask(task);
    });

  } else {

    throw new TypeError('Invalid task registration handler: ' +
      handler.toString());

  }

};
