'use strict';

var _ = require('lodash');
var async = require('async');
var core = require('../core.js');
var EventEmitter = require('events').EventEmitter;
var tsort = require('tsort');

// Singleton array to store registered steps.
var steps = [];

var count = exports.count = function() {
  return steps.length;
};

// Event emitter for module.
var events = exports.events = new EventEmitter();

// Blueprint for a step.
var blueprint = {
  name: null,
  description: null,
  deps: [],
  all: {
    darwin: null,
    linux: {
      debian: null,
      fedora: null,
      other: null
    },
    win32: null
  },
  isStep: true
};

/*
 * Format a step object in a nicer way.
 */
var prettyPrint = function(step) {
  return JSON.stringify(step);
};

/*
 * Valid top level property names for a step object.
 */
var validKeys = ['name', 'description', 'deps', 'all', 'isStep'];

/*
 * Validation function for a step.
 */
var invariant = function(step) {
  // Validate step is an object and has the isStep property.
  if (typeof step !== 'object' || !step.isStep) {
    throw new TypeError('Invalid step object: ' +
      prettyPrint(step));
  }
  // Validate name.
  if (typeof step.name !== 'string') {
    throw new Error('Install step has an invalid name: ' +
      prettyPrint(step));
  }
  // Validate description.
  if (typeof step.description !== 'string') {
    throw new Error('Install step has an invalid description: ' +
      prettyPrint(step));
  }
  // Validate dependencies.
  if (!Array.isArray(step.deps)) {
    throw new Error('Install step with invalid deps: ' +
      prettyPrint(step));
  }
  // Validate all key names.
  _.keys(step).forEach(function(key) {
    if (!_.contains(validKeys, key)) {
      throw new Error('Install step with invalid key [' + key + ']: ' +
        prettyPrint(step));
    }
  });
  // @todo: validate the names and types of all the functions inside all.

  // Validate there is at least one function implemented.
  var fns = [];
  var rec = function(node) {
    if (node === null) {

    } else if (typeof node === 'function') {
      fns.push(node);
    } else if (typeof node === 'object') {
      _.forIn(node, function(val, key) {
        rec(val);
      });
    } else {
      throw new Error('Invalid install step: ' + prettyPrint(step));
    }
  };
  rec(step.all);
  if (fns.length === 0) {
    throw new Error('Install step does not implement any step functions: ' +
      prettyPrint(step));
  }
};

/*
 * Perform a deep clone on our step blueprint.
 */
var cloneBlueprint = function() {
  return _.cloneDeep(blueprint);
};

/*
 * Register a step.
 */
var registerStep = exports.registerStep = function(handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('Invalid step handler: ' + handler);
  }

  var step = cloneBlueprint();
  // If handler doesn't include a callback, treat it as sync.
  if (handler.length === 1) {
    // Synchronous handler.
    handler(step);
    invariant(step);
    steps.push(step);
  } else if (handler.length === 2) {
    // Asynchronous handler.
    handler(step, function() {
      invariant(step);
      steps.push(step);
    });
  } else {
    throw new Error('Invalid install step registration handler: ' +
      handler.toString());
  }
};

/*
 * Clear all registered steps, mostly just for use with unit testing.
 */
var clearSteps = exports.clearSteps = function() {
  steps = [];
};

/*
 * Does step x require step y as a dependecy.
 */
/*var requires = function(x, y) {
  // Does x require y?
  return _.contains(x.deps, y.name);
};*/

/*
 * Compare two steps based on if one requires the other vice versa.
 */
/*var compareSteps = function(x, y) {
  if (typeof x !== 'object') {
    throw new TypeError('Invalid step object: ' + x);
  }
  if (typeof y !== 'object') {
    throw new TypeError('Invalid step object: ' + y);
  }
  if (requires(x, y) && requires(y, x)) {
    throw new Error('Two steps cannot both require each other!');
  }

  if (requires(x, y)) {
    return 1;
  } else if (requires(y, x)) {
    return -1;
  } else {
    return 0;
  }
};*/

/*
 * Unpack the implementation of a step for a given platform.
 */
var unpackStep = function(step, platform) {
  if (typeof step !== 'object') {
    throw new TypeError('Invalid step object: ' + step);
  }
  if (typeof platform !== 'string') {
    throw new TypeError('Invalid platform: ' + platform);
  }

  if (typeof step.all === 'function') {
    return step.all;
  } else if (platform === 'darwin' && step.all.darwin) {
    return step.all.darwin;
  } else if (platform === 'win32' && step.all.win32) {
    return step.all.win32;
  } else if (platform === 'linux') {
    throw new Error('not implemented yet :(');
  } else {
    return null;
  }
};

/*
 * Filter steps with no implementation for given platform.
 */
var filterSteps = function(platform) {
  if (typeof platform !== 'string') {
    throw new TypeError('Invalid platform: ' + platform);
  }

  return _.filter(steps, function(step) {
    return unpackStep(step, platform) !== null;
  });
};

/*
 * Get list of registered install steps, filters, sorts, and validates them.
 */
var getFilterAndSortSteps = exports.getSteps = function(platform) {
  if (typeof platform !== 'string') {
    throw new TypeError('Invalid platform: ' + platform);
  }

  // Filter out steps without an implementation for given platform.
  var filteredSteps = filterSteps(platform);

  // Use a topo sort for dependency sorting.
  // Graph to hold dependency tree.
  var graph = tsort();
  // Dictionary for holding steps by name.
  var stepMap = {};
  // Add each step to dependency graph and dictionary.
  filteredSteps.forEach(function(step) {
    graph.add([step.name].concat(step.deps));
    stepMap[step.name] = step;
  });
  // Sort the graph and reverse.
  var graphResults = graph.sort();
  graphResults.reverse();
  // Rebuild ordered array of steps from graph results.
  var orderedSteps = _.map(graphResults, function(name) {
    var result = stepMap[name];
    if (!result) {
      throw new Error('Install step does not exist: ' + name);
    } else {
      return result;
    }
  });

  // Validate all dependencies are included and in the right order.
  var names = [];
  var nameExists = function(name) {
    return _.contains(names, name);
  };
  orderedSteps.forEach(function(step) {
    step.deps.forEach(function(dep) {
      if (!nameExists(dep)) {
        throw new Error('Install step dependency [' + dep + ']' +
          ' was referenced by step [' + step.name + ']' +
          ' before dependency has been encountered.');
      }
    });
    if (nameExists(step.name)) {
      throw new Error('Duplicate install step name [' + step.name + '].');
    } else {
      names.push(step.name);
    }
  });

  return orderedSteps;
};

/*
 * Return a function that will run each install step in the correct order
 * and handle and errors that occur.
 */
var getInstall = exports.getInstall = function(platform) {
  // @todo: validate all dependencies were found.
  if (!platform) {
    platform = core.env.platform;
  }

  // Validate platform.
  if (typeof platform !== 'string') {
    throw new TypeError('Invalid platform: ' + platform);
  }

  return function(state) {
    var steps = getFilterAndSortSteps(platform);
    async.eachSeries(steps, function(step, next) {
      var fn = unpackStep(step, platform);
      if (!fn) {
        // Step has no implementation for this platform.
        next();
      } else {
        if (fn.length === 1) {
          // Step implementation is synchronous.
          events.emit('pre-step', step);
          fn(state);
          events.emit('post-step', step);
          next();
        } else if (fn.length === 2) {
          // Step implementation is asynchronous.
          events.emit('pre-step', step);
          fn(state, function(err) {
            events.emit('post-step', step);
            next(err);
          });
        } else {
          // Step does not have a valid number of arguments.
          var err = new Error('Invalid install step callback: ' +
            fn.toString());
          next(err);
        }
      }
    },
    function(err) {
      if (err) {
        events.emit('error', err);
      } else {
        events.emit('end', state);
      }
    });
  };
};

/*

registerStep(function(step, done) {
  step.name = 'ASYNC - Download cat!';
  step.deps = ['downloader'];
  step.all.darwin = function(state, next) {
    state.downloader.download('http://catsrkewl.com/tabby4.gif', function(err) {
      next(err);
    });
  };
  done();
});

registerStep(function(step) {
  step.name = 'SYNC - Set state with cat names!';
  step.deps = ['ASYNC - Download cat!'];
  step.all.darwin = function(state) {
    state.catsRKewl = true;
  };
});

*/
