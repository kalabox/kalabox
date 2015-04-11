'use strict';

var _ = require('lodash');
var assert = require('assert');
var yargs = require('yargs');
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
  taskTree = createBranch('root');
};

/*
 * Blueprint that every task will be cloned from.
 */
var blueprint = {
  path: [],
  description: null,
  kind: 'argv0',
  options: [],
  func: null,
  __isTask: true
};

/*
 * List of valid object keys for a task.
 */
var validKeys = Object.keys(blueprint);

/*
 * List of valid object keys for a task option.
 */
var validOptionKeys = ['name', 'alias', 'description', 'kind'];

/*
 * Parse a kind.
 */
var parseKind = function(kind) {
  if (typeof kind !== 'string')  {
    throw new TypeError('Invalid task kind: ' + kind);
  }

  if (kind === 'delegate') {
    // Delegate.
    return {kind: kind};
  } else if (kind === 'argv*') {
    // Infinite argv allowed.
    return {
      kind: 'argv',
      argvCount: Infinity
    };
  } else if (S(kind).startsWith('argv')) {
    // Specific number of argv allowed.
    var parsedInt;
    try {
      parsedInt = S(kind).chompLeft('argv').toInt();
    }
    catch (err) {
      throw new Error('Invalid task kind: ' + kind);
    }
    return {
      kind: 'argv' ,
      argvCount: parsedInt
    };
  } else {
    // Unexpected task kind, so throw an error.
    throw new TypeError('Invalid task kind: ' + kind);
  }

};

/*
 * Pretty print object in a nicer way.
 */
var pp = function(obj) {
  return JSON.stringify(obj);
};

/*
 * Validation function for a task option.
 */
var invariantOption = function(task, option) {

  // Code reuse!
  var toMsg = function(propertyName) {
    return 'Invalid task ' + propertyName + ':' +
      ' task.path=' + task.path + ' ' + pp(option);
  };

  // Validate name.
  if (typeof option.name !== 'string') {
    throw new TypeError(toMsg('name'));
  }

  // Validate alias.
  if (typeof option.alias !== 'string' && option.alias !== null) {
    throw new TypeError(toMsg('alias'));
  }

  // Validate kind.
  if (typeof option.kind !== 'string') {
    throw new TypeError(toMsg('kind'));
  }

  // Validate description.
  if (typeof option.description !== 'string') {
    throw new TypeError(toMsg('description'));
  }

  // Validate object keys.
  _.each(Object.keys(option), function(key) {
    if (!_.contains(validOptionKeys, key)) {
      throw new TypeError('Invalid task option property: ' +
        'key=' + key + ' ' + pp(task));
    }
  });

};

/*
 * Validation function for a task.
 */
var invariant = function(task) {

  // Validate object keys.
  _.each(Object.keys(task), function(key) {
    if (!_.contains(validKeys, key)) {
      throw new TypeError('Invalid task property: ' +
        key + ' ' + pp(task));
    }
  });

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

  // Validate kind.
  if (typeof task.kind !== 'string') {
    throw new TypeError('Invalid task kind: ' + pp(task));
  }
  parseKind(task.kind);

  // Validate options.
  if (!Array.isArray(task.options)) {
    throw new TypeError('Invalid task options: ' + pp(task));
  }
  _.each(task.options, function(option) {
    invariantOption(task, option);
  });

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
 * Mix in default values for an option.
 */
var mixInOption = function(option) {
  var defaults = {
    alias: null,
    kind: 'boolean'
  };
  var keys = Object.keys(option);
  _.each(defaults, function(val, key) {
    if (!_.contains(keys, key)) {
      option[key] = val;
    }
  });
};

/*
 * Add needed default stuff before task validation.
 */
var preDecorate = function(task) {
  _.each(task.options, mixInOption);
};

/*
 * Add needed default stuff to a build task.
 */
var decorate = function(task) {
  // Help option.
  task.options.push({
    name: 'help',
    alias: 'h',
    kind: 'boolean',
    description: 'Display help message.'
  });
  // Verbose option.
  task.options.push({
    name: 'verbose',
    alias: 'v',
    kind: 'boolean',
    description: 'Set output to be verbose.'
  });
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
    preDecorate(task);
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
      preDecorate(task);
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
var find = exports.find = function(tree, argv, globalArgv) {

  // Optional argument handling.
  if (globalArgv === undefined && isArgv(tree)) {
    globalArgv = argv;
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
  if (!globalArgv || typeof globalArgv !== 'object') {
    throw new TypeError('Invalid globalArgv object: ' + pp(globalArgv));
  }

  // Recursive function for searching the task tree.
  var rec = function(node, argv) {

    if (argv.length === 0) {

      // Reached end of argv path, so return current node.
      node.argv = argv;
      node.globalArgv = globalArgv;
      return node;

    } else if (isTask(node)) {

      // A task has been found along the argv path, so return it.
      node.argv = argv;
      node.globalArgv = globalArgv;
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
 * Configure options for the command line argument parser.
 */
var configureOptions = function(task) {
  _.each(task.options, function(option) {
    yargs.describe(option.name, option.description);
    if (option.alias) {
      yargs.alias(option.name, option.alias);
    }
    if (option.kind === 'string') {
      yargs.string(option.name);
    } else if (option.kind === 'boolean') {
      yargs.boolean(option.name);
    } else {
      throw new TypeError('Invalid task option kind: ' +
        'kind=' + option.kind + ' ' + pp(task));
    }
  });
};

/*
 * Parse command line arguments and return options and argv.
 */
var parseCommandLineArgs = function(task, argv, kind) {

  // Add tasks options to arg parser.
  configureOptions(task);
  // Don't allow any rogue options.
  yargs.strict();

  // Parse and set command line arguments.
  var parsed = yargs.parse(argv);
  argv = parsed._;
  delete parsed._;
  var options = parsed;

  // Validate argv.
  if (kind.argvCount !== Infinity) {
    if (argv.length !== kind.argvCount) {
      throw new Error('Expected exactly ' +
        kind.argvCount + ' arguments, but received ' +
        JSON.stringify(argv) + '.');
    }
  }

  // Return results.
  return {
    argv: argv,
    options: options
  };

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

  // Init these.
  var argv = [];
  var options = {};

  // Parse command line arguments.
  var kind = parseKind(task.kind);
  if (kind.kind === 'argv') {

    // Parse command line arguments.
    var result = parseCommandLineArgs(task, task.argv, kind);
    argv = result.argv;
    options = result.options;

  } else if (kind.kind === 'delegate') {

    // Don't parse any of the arguments, just pass them along to the task.
    argv = task.argv;

  } else {

    // This should never happen.
    assert(false);

  }

  // Display task help message instead of running.
  if (task.globalArgv.help) {
    console.log(yargs.help());
    return process.exit(1);
  }

  // Build context for task function.
  var context = {
    argv: argv,
    options: options,
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

  // Recursively build list of lines.
  var lines = [];
  var rec = function(node, depth) {
    if (isTask(node)) {
      lines.push({
        depth: depth,
        name: getName(node),
        description: node.description
      });
    } else if (isBranch(node)) {
      lines.push({
        depth: depth,
        name: getName(node)
      });
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

  lines = _.map(lines, function(line) {
    var depthPrefix = S(' ').repeat(tabSpacing * line.depth).s;
    var name = depthPrefix + line.name;
    return {
      name: name,
      description: line.description
    };
  });

  var widths = _.map(lines, function(line) {
    return line.name.length;
  });
  var maxWidth = _.max(widths);

  lines = _.map(lines, function(line) {
    var name = S(line.name).padRight(maxWidth).s;
    if (line.description) {
      return [name, line.description].join(S(' ').repeat(tabSpacing).s);
    } else {
      return name;
    }
  });

  lines.unshift(header);
  lines.push('');
  return lines.join('\n');

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

/*
 * Check if an argv array is raw and not already parsed.
 */
var isRawArgv = function(argv) {
  if (!_.isArray(argv)) {
    return false;
  }
  var nonStringsFound = _.find(argv, function(arg) {
    return !_.isString(arg);
  });
  return !nonStringsFound;
};

/*
 * Partition command line arguments between global and task based on a
 * double consecutive dash option.
 */
var partitionArgv = exports.partitionArgv = function(argv) {

  // Validate.
  if (!isRawArgv(argv)) {
    throw new TypeError('Invalid raw argv: ' + argv);
  }

  // Splitter of command line arguments.
  var splitter = '--';

  // Find index of splitter.
  var indexOfSplitter = _.reduce(argv, function(acc, arg, index) {
    return arg === splitter ? index : acc;
  }, undefined);

  // Init return value.
  var retVal = {
    global: null,
    task: null
  };

  if (indexOfSplitter !== undefined) {

    // Everything before splitter goes to task, after splitter is global.
    retVal.global = argv.slice(indexOfSplitter + 1, argv.length);
    retVal.task = argv.slice(0, indexOfSplitter);

  } else {

    // Everything goes to task.
    retVal.global = [];
    retVal.task = argv;

  }

  // Return.
  return retVal;

};

/*
 * Parse global argv for global options.
 */
var parseGlobalArgv = exports.parseGlobalArgv = function(argv) {

  var gYargs = require('yargs');

  // Validate.
  if (!isRawArgv(argv)) {
    throw new TypeError('Invalid raw argv: ' + argv);
  }

  // Help option.
  gYargs.option('h', {
    alias: 'help',
    //required: false,
    type: 'boolean',
    //default: false,
    describe: 'Display help message.'
  });

  // Verbose option.
  gYargs.option('v', {
    alias: 'verbose',
    //required: false,
    type: 'boolean',
    //default: false,
    describe: 'Use verbose output.'
  });

  // Make sure any unexpected options cause an exception.
  gYargs.strict();

  // Parse and return argv.
  return gYargs.parse(argv);

};

// Easter eggs are soooo cool!
registerTask(function(task) {
  task.path = ['shields'];
  task.description = 'Shield generator operation.';
  task.options.push({
    name: 'status',
    alias: 's',
    description: 'Display shield generator status.'
  });
  task.options.push({
    name: 'webcam',
    alias: 'w',
    description: 'Semi-real time web cam snapshot of the Death Star.'
  });
  task.func = function() {
    if (this.options.status) {
      console.log('Oh I\'m afraid the shield generator is quite operational!!');
    } else if (this.options.webcam) {
      var deathStar =
        '            .          .                     \n' +
        '  .          .                  .          . \n' +
        '        +.           _____  .        .       \n' +
        '    .        .   ,-~"     "~-.               \n' +
        '               ,^ ___         ^. +           \n' +
        '              / .^   ^.         \         .  \n' +
        '             Y  l  o  !          Y  .        \n' +
        '     .       l_ `.___./        _,[           \n' +
        '             |^~"-----------""~ ^|       +   \n' +
        '   +       . !                   !     .     \n' +
        '          .   \                 /            \n' +
        '               ^.             .^            .\n' +
        '                 "-.._____.,-" .             \n' +
        '          +           .                .   + \n' +
        '   +          .             +                \n' +
        '          .             .      .            .';
      console.log(deathStar);
    }
  };
});
