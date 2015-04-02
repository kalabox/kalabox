'use strict';

var _ = require('lodash');
var assert = require('assert');

/*
 * Create and return a new branch object for the task tree.
 */
var createBranch = function(name) {
  return {
    name: name,
    children: [],
    __isBranch: true
  };
};

/*
 * The task tree object.
 */
var taskTree = createBranch('root');

/*
 * Is object a branch?
 */
var isBranch = function(obj) {
  return obj.__isBranch;
};

/*
 * Is object a task?
 */
var isTask = function(obj) {
  return obj.__isTask;
};

/*
 * Is object either a branch or a task?
 */
var isBranchOrTask = function(obj) {
  return isBranch(obj) || isTask(obj);
};

/*
 * Return name of branch or task.
 */
var getName = function(obj) {
  if (isBranch(obj)) {
    return obj.name;
  } else if (isTask(obj)) {
    if (obj.path.length < 1) {
      assert(false);
    }
    return obj.path[0];
  } else {
    assert(false);
  }
};

/*
 * Standard compare function to apply to either branch or task.
 */
var compareBranchOrTask = function(x, y) {
  var xName = getName(x);
  var yName = getName(y);

  if (typeof xName !== 'string' || xName.length < 1) {
    assert(false);
  }
  if (typeof yName !== 'string' || yName.length < 1) {
    assert(false);
  }

  if (xName === yName) {
    return 0;
  } else if (xName < yName) {
    return -1;
  } else if (xName > yName) {
    return 1;
  } else {
    assert(false);
  }
};

/*
 * Check if branch contains a child with a name/path.
 */
var branchContainsChild = function(branch, obj) {
  var names = _.map(branch.children, getName);
  var name = getName(obj);
  return _.contains(names, name);
};

/*
 * Add a task or branch to an existing branch.
 */
var addChild = function(branch, child) {
  // Validate.
  if (!isBranch(branch)) {
    assert(false);
  }
  if (!isBranchOrTask(child)) {
    assert(false);
  }

  // Branch already contains a child with the same name.
  if (branchContainsChild(branch, child)) {
    assert(false);
  }

  // Add child and then sort children.
  branch.children.push(child);
  branch.children.sort(compareBranchOrTask);
};

/*
 * Add a task to the root of the task tree.
 */
var addTask = function(task) {

  // Validate input.
  if (!isTask(task)) {
    throw new TypeError('Invalid task: ' + task);
  }
  if (task.path.length === 0) {
    throw new TypeError('Invalid task path: ' + task) ;
  }

  // Recursive function for placing task in task tree.
  var rec = function(node, path) {

    // Validate.
    if (!isBranch(node)) {
      assert(false);
    }
    if (path.length === 0) {
      assert(false);
    }

    // Partition head and tail.
    var hd = path[0];
    var tl = path.slice(1);

    // Find a child of node that matches path.
    var cursor = _.find(node.children, function(obj) {
      return getName(obj) === hd;
    });

    // Conflicting tasks exist in task tree.
    if (cursor && isTask(cursor)) {
      assert(false);
    }

    // Continue.
    if (tl.length === 0) {

      // We are at the end of the path.
      task.path = [hd];

      if (cursor) {

        addChild(cursor, task);

      } else {

        addChild(node, task);

      }

      return;

    } else {

      // We are NOT at the end of the path.
      if (!cursor) {

        cursor = createBranch(hd);
        addChild(node, cursor);

      }

      return rec(cursor, tl);

    }

  };

  // Kick off recursive function for placing task in task tree.
  rec(taskTree, task.path);

};

/*
 * Clear the task tree.
 */
var clearTasks = exports.clearTasks = function() {
  throw new Error('Not implemented.');
};

/*
 * Blueprint that every task will be cloned from.
 */
var blueprint = {
  path: [],
  description: null,
  options: [],
  func: null,
  __isTask: true
};

/*
 * Pretty print object in a nicer way.
 */
var pp = function(obj) {
  JSON.stringify(obj);
};

/*
 * Validation function for a task.
 */
var invariant = function(task) {

  // Validate __isTask.
  if (!task.__isTask) {
    throw new TypeError('Invalid task: ' + pp(task));
  }

  // Validate path.
  if (!Array.isArray(task.path)) {
    throw new TypeError('Invalid task path: ' + pp(task));
  }

  // Validate description.
  if (typeof task.description !== 'string' || task.description.length === 0) {
    throw new TypeError('Invalid task description: ' + pp(task));
  }

  // @todo: validate options.

  // Validate function.
  if (typeof task.func !== 'function') {
    throw new TypeError('Invalid task function: ' + pp(task));
  }

};

/*
 * Take blueprint and clone it to produce a new object reference.
 */
var cloneBlueprint = function() {
  return _.cloneDeep(blueprint);
};

/*
 * Add new task to the task tree.
 */
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

/*
 * Return the task tree.
 */
var getTaskTree = exports.getTaskTree = function() {
  return taskTree;
};
