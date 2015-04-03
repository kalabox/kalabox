'use strict';

var _ = require('lodash');
var assert = require('assert');
var GetOpt = require('node-getopt');
var S = require('string');

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
var isBranch = exports.isBranch = function(obj) {
  return obj.__isBranch;
};

/*
 * Is object a task?
 */
var isTask = exports.isTask = function(obj) {
  return obj.__isTask;
};

/*
 * Is object either a branch or a task?
 */
var isBranchOrTask = function(obj) {
  return isBranch(obj) || isTask(obj);
};

/*
 * Is object an argv object?
 */
var isArgv = exports.isArgv = function(obj) {
  return Array.isArray(obj);
  //return (typeof obj === 'object' && _.has(obj, '_'));
};

/*
 * Return name of branch or task.
 */
var getName = exports.getName = function(obj) {
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
 * Search a branch's children for a branch or task with a given name.
 */
var findChild = function(branch, name) {
  return _.find(branch.children, function(child) {
    return getName(child) === name;
  });
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
  if (!isTask(task)) {
    throw new TypeError('Invalid task: ' + pp(task));
  }

  // Validate path.
  if (!Array.isArray(task.path)) {
    throw new TypeError('Invalid task path: ' + pp(task));
  }
  if (task.path.length === 0) {
    throw new TypeError('Empty task path: ' + pp(task));
  }
  task.path.forEach(function(atom) {
    if (typeof atom !== 'string') {
      throw new TypeError('Invalid task path: ' + pp(task));
    }
  });

  // Validate description.
  if (typeof task.description !== 'string' || task.description.length === 0) {
    throw new TypeError('Invalid task description: ' + pp(task));
  }

  // @todo: validate options.

  // Validate function.
  if (typeof task.func !== 'function') {
    throw new TypeError('Invalid task function: ' + pp(task));
  }
  if (task.func.length > 1) {
    throw new TypeError('Wrong number of arguments in task function: ' +
      task.func.toString());
  }

};

/*
 * Take blueprint and clone it to produce a new object reference.
 */
var cloneBlueprint = function() {
  return _.cloneDeep(blueprint);
};

/*
 * Add needed default stuff to a build task.
 */
var decorate = function(task) {
  var helpOption = _.find(task.options, function(option) {
    return option[0] === 'h' || option[1] === 'help';
  });

  if (!helpOption) {
    task.options.push(['h', 'help', 'Display usage and options.']);
  }
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
    decorate(task);
    addTask(task);

  } else if (handler.length === 2) {

    var timeout = setTimeout(function() {
      throw new Error('Task registration done callback was not called: ' +
        task.path);
    }, 2 * 60 * 1000);

    handler(task, function() {
      clearTimeout(timeout);
      invariant(task);
      decorate(task);
      addTask(task);
    });

  } else {

    throw new TypeError('Invalid task registration handler: ' +
      handler.toString());

  }

};

/*
 * Shortcut alias.
 */
exports.add = registerTask;

/*
 * Return the task tree.
 */
var getTaskTree = exports.getTaskTree = function() {
  return taskTree;
};

/*
 * Search a task tree using a given argv, return the found task and
 * slice the used portion from the argv.
 */
var find = exports.find = function(tree, argv) {

  // Optional argument handling.
  if (argv === undefined && isArgv(tree)) {
    argv = tree;
    tree = getTaskTree();
  }

  // Validate.
  if (!isBranch(tree)) {
    throw new TypeError('Expected a branch: ' + tree);
  }
  if (!isArgv(argv)) {
    throw new TypeError('Invalid argv object: ' + pp(argv));
  }

  // Recursive function for searching the task tree.
  var rec = function(node, argv) {

    if (argv.length === 0) {

      // Reached end of argv path, so return current node.
      node.argv = argv;
      return node;

    } else if (isTask(node)) {

      // A task has been found along the argv path, so return it.
      node.argv = argv;
      return node;

    } else if (isBranch(node)) {

      // Get the head of the argv path.
      var hd = argv[0];

      // Find a child of node branch that matches hd.
      var child = findChild(node, hd);

      if (child) {

        // Update the argv path and then recurse with child that was found.
        return rec(child, argv.slice(1));

      } else {

        // No matching child was found, it's a dead search so return null.
        return null;

      }

    } else {

      // This should never happen.
      assert(false);

    }

  };

  // Kick off the recursive function with the task tree.
  return rec(tree, argv);
};

/*
 * Run a task's function.
 */
var run = exports.run = function(task, callback) {

  // Validate.
  if (!isTask(task)) {
    throw new TypeError('Invalid task object: ' + pp(task));
  }
  if (!isArgv(task.argv)) {
    throw new TypeError('Invalid argv object: ' + pp(task.argv));
  }
  if (typeof callback !== 'function') {
    throw new TypeError('Invalid callback function: ' + pp(callback));
  }

  // Parse cli options.
  var parser = new GetOpt(task.options);
  var argv = parser.parse(task.argv);

  // Display task help message instead of running.
  if (argv.options.help) {
    console.log(parser.getHelp());
    return process.exit(1);
  }

  // Build context for task function.
  var context = {
    argv: argv,
    task: task
  };

  // Find out if task function is asynchronous.
  var isAsync = task.func.length === 1;
  if (task.func.length > 1) {
    // This should never happen.
    assert(false);
  }

  if (isAsync) {

    // Treat task function as asynchronous.
    task.func.apply(context, [callback]);

  } else {

    // Treat task function as synchronous.
    task.func.apply(context, []);
    callback();

  }

};

/*
 * Return string representation of task tree.
 */
var getMenu = exports.getMenu = function(branch) {

  // Validate.
  if (!isBranch(branch)) {
    throw new TypeError('Invalid branch: ' + pp(branch));
  }

  var tabSpacing = 4;

  var header = '--- Command Menu ---\n';

  var output = header;

  var append = function(s, depth) {
    output += S(' ').repeat(depth * tabSpacing).s;
    if (Array.isArray(s)) {
      output += s.join(S(' ').repeat(tabSpacing * 2).s);
    } else if (typeof s === 'string') {
      output += s;
    } else {
      assert(false);
    }
    output += '\n';
  };

  var rec = function(node, depth) {
    if (isTask(node)) {
      append([getName(node), node.description], depth);
    } else if (isBranch(node)) {
      append(getName(node), depth);
      node.children.forEach(function(child) {
        rec(child, depth + 1);
      });
    } else {
      assert(false);
    }

  };
  branch.children.forEach(function(child) {
    rec(child, 0);
  });

  return output;

};

/*
 * Display menu from branch's reference point, and then exit(1).
 */
var showMenu = exports.showMenu = function(branch) {
  // Display menu.
  console.log(getMenu(branch));
  // Exit the process.
  process.exit(1);
};
