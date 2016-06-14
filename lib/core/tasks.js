/**
 * Module for adding command line tasks to the kalabox command line interface.
 *
 * @name tasks
 */

'use strict';

var _ = require('lodash');
var assert = require('assert');
var path = require('path');
var chalk = require('chalk');
var deps = require('./deps.js');
var events = require('./events.js');

// Splitter of command line arguments.
var splitter = '--';

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

/**
 * Is object a branch?
 * @memberof tasks
 */
var isBranch = exports.isBranch = function(obj) {
  return obj.__isBranch;
};

/**
 * Is object a task?
 * @memberof tasks
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
var isArgv = function(obj) {
  return _.has(obj, 'payload') &&
    _.has(obj, 'options') &&
    _.has(obj, 'rawOptions');
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

/**
 * Remove a task from the task tree based on it's path.
 * @memberof tasks
 */
var remove = exports.remove = function(path) {

  /*
   * This function is forgiving, if the path doesn't match a task it just
   * returns without throwing an error.
   */

  // Recursive function.
  var rec = function(node, path) {

    // This should never happen.
    if (path.length === 0) {
      assert(false);
    }

    var hd = _.head(path);
    var tl = _.tail(path);

    // Find the cursor.
    var cursor = _.find(node.children, function(obj) {
      return getName(obj) === hd;
    });

    if (!cursor) {

      // No matching path was found.
      return;

    } else if (tl.length === 0) {

      if (isTask(cursor)) {

        // We are at the end of the path and found a matching node, so delete
        // the node from it's parent.
        node.children = _.remove(node.children, function(child) {
          return (getName(child) !== getName(cursor));
        });

      }

    } else {

      // We are not at the end of the path, so go deeper.
      return rec(cursor, tl);

    }

  };

  // Init recursive function.
  rec(taskTree, path);

};

/*
 * Add a task to the root of the task tree.
 */
var addTask = function(task) {

  remove(task.path);

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

      throw new Error('Task already exists: ' + task.path.join(' -> '));

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

/**
 * Clear the task tree.
 */
exports.clearTasks = function() {
  taskTree = createBranch('root');
};

/*
 * Blueprint that every task will be cloned from.
 */
var blueprint = {
  path: [],
  description: null,
  category: 'global',
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
 * List of valid categories
 */
var validCategories = ['global', 'appAction', 'appCmd', 'dev'];

/*
 * List of valid categories
 */
var catDesc = {
  global: 'Global commands that can be run from anywhere',
  appAction: 'Actions that can be performed on this app',
  appCmd: 'Commands and tools this app can use',
  dev: 'Some things that are useful for development'
};

/*
 * Parse a kind.
 */
var parseKind = function(kind) {
  if (typeof kind !== 'string')  {
    throw new TypeError('Invalid task kind: ' + kind);
  }

  if (kind === 'delegate') {
    // Delegate.
    return {
      kind: kind,
      argvCount: Infinity
    };
  } else if (kind === 'argv*') {
    // Infinite argv allowed.
    return {
      kind: 'argv',
      argvCount: Infinity
    };
  } else if (_.startsWith(kind, 'argv')) {
    // Specific number of argv allowed.
    var parsedInt;
    try {
      parsedInt = _.parseInt(kind.slice('argv'.length));
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

  // Validate category.
  var cat = task.category;
  if (typeof cat !== 'string' || !_.includes(validCategories, cat)) {
    throw new TypeError('Invalid task category: ' + pp(task));
  }

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

  // Swap alias and name around.
  if (option.name && option.alias && option.name.length > option.alias.length) {
    var name = option.alias;
    option.alias = option.name;
    option.name = name;
  }

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

/**
 * Add new task to the task tree.
 * @memberof tasks
 * @static
 * @method
 * @arg {function} handler - Function used to build a new task.
 * @arg {Object} handler.task - Uninitialized task object.
 * @arg {function} handler.done [optional] - Callback function to return async
 *   control back to kalabox.
 * @example
 * kbox.core.tasks.registerTask(function(task, done) {
 *
 *   // Set path of task so cli command will be 'kbox util foo bar'.
 *   task.path = ['util', 'foo', 'bar'];
 *
 *   // Set a description for the cli command.
 *   task.description = 'Bar the foo and output the results.';
 *
 *   // Allow any number of cli arguments.
 *   // 'argv*' - allow any number of cli agruments.
 *   // 'argv3' - allow 3 and only 3 cli arguments.
 *   // 'argv0' - do not allow any cli arguments.
 *   task.kind = 'argv*';
 *
 *   // Add a cli option for force. 'kbox util foo bar -- -f'
 *   task.options.push({
 *     name: 'force',
 *     alias: 'f',
 *     description: 'Force the bar to foo even if it does not want to';
 *   });
 *
 *   // Function to execute as the command.
 *   task.func = function(done) {
 *
 *     // Get cli option value for force.
 *     var force = this.options.force;
 *
 *     // Get cli arguments.
 *     var args = this.payload;
 *
 *     bar.foo(args, force, function(err, result) {
 *       if (err) {
 *         return done(err);
 *       }
 *       console.log(result);
 *       done();
 *     });
 *
 *   };
 *
 *   // Return control back to kalabox.
 *   done();
 * });
 */
var registerTask = exports.registerTask = function(handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('Invalid task registration handler: ' + handler);
  }

  var task = cloneBlueprint();
  if (handler.length === 1) {

    handler(task);

    return events.emit('pre-task-add', task)

    .then(function() {
      preDecorate(task);
      invariant(task);
      addTask(task);
    });

  } else if (handler.length === 2) {

    var timeout = setTimeout(function() {
      throw new Error('Task registration done callback was not called: ' +
        task.path);
    }, 2 * 60 * 1000);

    handler(task, function() {

      return events.emit('pre-task-add', task)

      .then(function() {
        clearTimeout(timeout);
        preDecorate(task);
        invariant(task);
        addTask(task);
      });

    });

  } else {

    throw new TypeError('Invalid task registration handler: ' +
      handler.toString());

  }

};

/**
 * Shortcut alias.
 */
exports.add = registerTask;

/**
 * Return the task tree.
 * @memberof tasks
 */
var getTaskTree = exports.getTaskTree = function() {
  return taskTree;
};

/**
 * Search a task tree using a given argv, return the found task and
 * slice the used portion from the argv.
 */
exports.find = function(tree, argv) {

  // Optional argument handling.
  if (argv === undefined) {
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
  var rec = function(node, payload) {

    if (payload.length === 0) {

      // Reached end of argv path, so return current node.
      node.argv = {
        payload: payload,
        options: argv.options,
        rawOptions: argv.rawOptions
      };
      return node;

    } else if (isTask(node)) {

      // A task has been found along the argv path, so return it.
      node.argv = {
        payload: payload,
        options: argv.options,
        rawOptions: argv.rawOptions
      };
      return node;

    } else if (isBranch(node)) {

      // Get the head of the argv path.
      var hd = payload[0];
      var tl = payload.slice(1);

      // Find a child of node branch that matches hd.
      var child = findChild(node, hd);

      if (child) {

        // Update the argv path and then recurse with child that was found.
        return rec(child, tl);

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
  return rec(tree, argv.payload);
};

/*
 * Configure global options for the command line argument parser.
 */
var configureGlobalOptions = function(parser) {

  // Validate.
  if (!_.isObject(parser)) {
    throw new TypeError('Invalid yargs object: ' + pp(parser));
  }

  // Help option.
  parser.option('h', {
    alias: 'help',
    type: 'boolean',
    describe: 'Display help message.'
  });

  // Verbose option.
  parser.option('v', {
    alias: 'verbose',
    type: 'boolean',
    describe: 'Use verbose output.'
  });

  // Debug option.
  parser.option('debug', {
    type: 'boolean',
    describe: 'Use debug output.'
  });

};

/*
 * Configure options for the command line argument parser.
 */
var configureOptions = function(parser, task) {
  _.each(task.options, function(option) {
    parser.describe(option.name, option.description);
    if (option.alias) {
      parser.alias(option.name, option.alias);
    }
    if (option.kind === 'string') {
      parser.string(option.name);
    } else if (option.kind === 'boolean') {
      parser.boolean(option.name);
    } else {
      throw new TypeError('Invalid task option kind: ' +
        'kind=' + option.kind + ' ' + pp(task));
    }
  });
};

/*
 * Parse command line arguments and return argv.
 */
var parseOptions = function(parser, argv, strict) {

  // Validate.
  if (!_.isObject(parser)) {
    throw new TypeError('Invalid parser objct: ' + pp(parser));
  }
  if (!isArgv(argv)) {
    throw new TypeError('Invalid argv object: ' + pp(argv));
  }
  if (!_.isBoolean(strict)) {
    throw new TypeError('Invalid strict boolean: ' + pp(strict));
  }

  if (strict) {
    // Don't allow any rogue options.
    parser.strict();
  }

  var retVal = {
    payload: argv.payload,
    options: parser.parse(argv.rawOptions),
    rawOptions: argv.rawOptions
  };

  // Guard against non-options right of the splitter.
  if (strict && retVal.options._.length !== 0) {
    throw new Error('Non-options are NOT allowed to the right of "' +
      splitter + '" : ' + retVal.options._);
  }

  // Return.
  return retVal;

};

/**
 * Run a task's function.
 */
exports.run = function(task, callback) {

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

  // Parse command line arguments.
  var parser = require('yargs');
  // Add global options.
  configureGlobalOptions(parser);
  // Add task specific options.
  configureOptions(parser, task);
  // Strictly enforce option parsing.
  var strict = true;
  // Parse options.
  task.argv = parseOptions(parser, task.argv, strict);

  // Validate payload based on task kind.
  var parsedKind = parseKind(task.kind);

  /*
   * Check if our payload has options
   */
  var hasOptions = function(payload) {
    return _.reduce(payload, function(ultimateTruth, arg) {
      return ultimateTruth || _.includes(arg, '-') || _.includes(arg, '--');
    }, false);
  };

  // Validate argv.
  if (parsedKind.argvCount !== Infinity) {
    if (task.argv.payload.length !== parsedKind.argvCount) {
      // Print a helpful message about options if we get to this point
      if (hasOptions(task.argv.payload)) {
        var taskPath = ['kbox', task.path.join(' ')].join(' ');
        var taskOpts = task.argv.payload.join(' ');
        var taskTotal = [taskPath, splitter, taskOpts].join(' ');
        throw new Error('Did you mean to run ' + taskTotal + '?');
      }
      //
      else {
        throw new Error('Expected exactly ' +
        parsedKind.argvCount + ' arguments, but received ' +
        JSON.stringify(task.argv.payload) + '.');
      }
    }
  }

  // Display task help message instead of running.
  if (task.argv.options.help) {
    console.log(parser.help());
    return process.exit(1);
  }

  // Build context for task function.
  var context = {
    payload: task.argv.payload,
    options: task.argv.options,
    rawOptions: task.argv.rawOptions,
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
var getMenu = function(branch, category, appName) {

  // Validate.
  if (!isBranch(branch)) {
    throw new TypeError('Invalid branch: ' + pp(branch));
  }

  // Recursively map branch to get the cli look we want.
  var recMap = function(node) {

    if (isTask(node)) {

      // This is a task so do nothing.
      return [node];

    } else if (isBranch(node)) {

      // Concat map children with a recMap.
      node.children = _.flatten(_.map(node.children, recMap));

      // Sort children.
      node.children.sort(compareBranchOrTask);

      // Resolve duplicate named children.
      // Group children by name.
      var nameMap = _.groupBy(node.children, getName);

      // Resolve conflicts.
      node.children = _.map(_.values(nameMap), function(children) {

        if (children.length === 1) {

          // No conflicts so just return head of array.
          return children[0];

        } else {

          // Resolve conflict by finding a single node with the override flag.
          var overrides = _.filter(children, function(child) {
            return child.__override;
          });

          if (overrides.length === 1) {

            // Conflict resolved.
            return overrides[0];

          } else {

            // Conflict can not be resolved, throw an error.
            throw new Error('Conflicting task names can not be resolved: ' +
              pp(children));

          }

        }

      });

      if (getName(node) === appName) {

        // Replace this node with this nodes children.
        _.each(node.children, function(child) {
          // Mark each child with an override flag so we can resolve conflicts.
          child.__override = true;
        });
        return node.children;

      } else {

        // Just return.
        return [node];

      }

    } else {

      // This should never happen.
      assert(false);

    }

  };

  // Recursively build list of lines.
  var recAdd = function(node, parentName, depth) {

    // Default depth.
    if (_.isUndefined(depth)) {
      depth = 0;
    }

    // Default parentName.
    if (_.isUndefined(parentName)) {
      parentName = 'root';
    }

    if (isTask(node)) {

      // This is a task so add to lines and nothing further.
      lines.push({
        depth: depth,
        name: getName(node),
        parentName: parentName,
        description: node.description
      });

    } else if (isBranch(node)) {

      lines.push({
        depth: depth,
        name: getName(node),
        parentName: parentName
      });
      node.children.forEach(function(child) {
        recAdd(child, getName(node), depth + 1);
      });

    } else {

      // This should never happen.
      assert(false);

    }

  };

  // Only do this is branch is not the app branch.
  if (getName(branch) !== appName) {
    branch = recMap(branch)[0];
  }

  // Filter by correct category
  var kids = _.filter(branch.children, function(child) {
    // Go one level deeper if we are on a branch and
    // want to find the category of its children
    if (child.category === undefined) {
      if (!_.isEmpty(child.children)) {
        return child.children[0].category === category;
      }
    }
    else {
      return child.category === category;
    }
  });

  if (!_.isEmpty(kids)) {
    // Number of spaces sub commands will be indented.
    var tabSpacing = 4;

    // Header for menu.
    var header = '\n' + catDesc[category];

    // Init list of lines.
    var lines = [];

    kids.forEach(function(child) {
      recAdd(child);
    });

    lines = _.map(lines, function(line) {
      var depthPrefix = _.repeat(' ', tabSpacing * line.depth + 2);
      var name = depthPrefix + line.name;
      return {
        name: name,
        description: line.description
      };
    });

    /*
    var widths = _.map(lines, function(line) {
      return line.name.length;
    });
    */
    var maxWidth = 15;

    lines = _.map(lines, function(line) {
      var name = _.padRight(line.name, maxWidth);
      if (line.description) {
        return [
          chalk.green(name),
          chalk.yellow(line.description)
        ].join(_.repeat(' ', tabSpacing));
      } else {
        return chalk.green(name);
      }
    });

    lines.unshift(header);
    return lines.join('\n');
  }
};

/**
 * Display menu from branch's reference point, and then exit(1).
 */
exports.showMenu = function(branch, app) {

  // Display usage.
  var target;
  try {
    target = path.basename(process.argv.slice(1, 2));
  } catch (err) {
    target = null;
  }
  if (!target) {
    target = 'kbox';
  }
  var usage = 'Usage: ' + target + ' <command> [-- <options>]';
  console.log(usage);

  // Helper text for app commands if we have no app
  if (_.isEmpty(app)) {
    var appCmds = [
      'Change to an app directory for additional app specific commands.',
      'Run `kbox list` to get a list of your apps.'
    ];
    console.log(appCmds.join(' '));
  }

  // Display commands.
  var appName = app ? app.name : undefined;
  validCategories.forEach(function(category) {

    // Check to see if we want to display our dev tasks
    var menu;
    var globalConfig = deps.get('globalConfig');
    if (category === 'dev' && globalConfig.locked === false) {
      menu = getMenu(branch, category, appName);
    }

    // Load all other categories no matter what
    if (category !== 'dev') {
      menu = getMenu(branch, category, appName);
    }

    // Only print it cat is not empty
    if (menu !== undefined) {
      console.log(menu);
    }

  });
  console.log('');

  // Display options.
  var parser = require('yargs');
  configureGlobalOptions(parser);
  console.log(parser.help());

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

/**
 * Partition command line arguments between global and task based on a
 * double consecutive dash option.
 */
exports.partitionArgv = function(argv) {

  // Validate.
  if (!isRawArgv(argv)) {
    throw new TypeError('Invalid raw argv: ' + argv);
  }

  // Find index of splitter.
  var indexOfSplitter = _.reduce(argv, function(acc, arg, index) {
    return arg === splitter ? index : acc;
  }, undefined);

  var initArgv = null;

  if (indexOfSplitter !== undefined) {

    // Everything before splitter goes to payload, after splitter is options.
    var payload = argv.slice(0, indexOfSplitter);
    var rawOptions = argv.slice(indexOfSplitter + 1, argv.length);
    initArgv = {
      payload: payload,
      options: {},
      rawOptions: rawOptions
    };

  } else {

    // Everything goes to payload.
    initArgv = {
      payload: argv,
      options: {},
      rawOptions: []
    };

  }

  // Init new parser.
  var parser = require('yargs');
  // Add global options to parser.
  configureGlobalOptions(parser);
  // Don't enforce strict option parsing as the task might add options later.
  var strict = false;
  // Parser the global options.
  var retVal = parseOptions(parser, initArgv, strict);

  // Reset parser.
  parser.reset();

  // Return.
  return retVal;

};
