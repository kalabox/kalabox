//@todo: document?

'use strict';

var _ = require('lodash');
var core = require('../core.js');
var EventEmitter = require('events').EventEmitter;
var tsort = require('tsort');
var util = require('./../util.js');
var Promise = require('bluebird');
Promise.longStackTraces();
var VError = require('verror');

module.exports = function() {

  // Singleton array to store registered steps.
  var steps = [];

  // Event emitter for module.
  var events = new EventEmitter();

  // Blueprint for a step.
  var blueprint = {
    name: null,
    description: null,
    deps: [],
    subscribes: [],
    first: false,
    last: false,
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
  var validKeys = [
    'name',
    'description',
    'deps',
    'subscribes',
    'first',
    'last',
    'all',
    'isStep'
  ];

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
    // Validate subscribes.
    if (!Array.isArray(step.subscribes)) {
      throw new Error('Install step with invalid subscribes: ' +
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
        _.forIn(node, function(val/*, key*/) {
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
  var registerStep = function(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('Invalid step handler: ' + handler);
    }

    var step = cloneBlueprint();
    // If handler doesn't include a callback, treat it as sync.
    if (handler.length === 1) {
      // @todo @bcauldwell - Maybe make this able to handle promises.
      // Synchronous handler.
      handler(step);
      invariant(step);
      steps.push(step);
    } else if (handler.length === 2) {
      // Make sure the defined done callback gets called in a timely manner.
      var timeout = setTimeout(function() {
        throw new Error('Install step registration defined but did NOT call' +
          'the completion callback: ' + step.name);
      }, 2 * 60 * 1000);
      // Asynchronous handler.
      handler(step, function() {
        clearTimeout(timeout);
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
  var clearSteps = function() {
    steps = [];
  };

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

    // all is a function.
    if (typeof step.all === 'function') {

      return step.all;

    // all.darwin is a function.
    } else if (platform === 'darwin' && step.all.darwin) {

      return step.all.darwin;

    // all.win32 is a function.
    } else if (platform === 'win32' && step.all.win32) {

      return step.all.win32;

    // platform is linux.
    } else if (platform === 'linux') {

      // all.linux is a function.
      if (typeof step.all.linux === 'function') {

        return step.all.linux;

      } else {

        // Parse the linux os release file.
        var flavor = util.linux.getFlavor();

        // flavor is debian.
        if (flavor === 'debian') {

          return step.all.linux.debian;

        // flavor is fedora.
        } else if (flavor === 'fedora') {

          return step.all.linux.fedora;

        // flavor is other.
        } else {

          return step.all.linux.other;

        }
      }

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
   * Preprocess steps to fulfill step.subscribes by adding a reverse dependency.
   */
  var preprocessSteps = function(steps) {

    // Build string map of steps by step.name.
    var stepMap = {};
    _.forEach(steps, function(step) {
      stepMap[step.name] = step;
    });

    // Add reverse dependencies.
    _.forEach(steps, function(step) {

      // Loop through each subscribe.
      _.forEach(step.subscribes, function(subscribe) {

        // Map subscribe to a step.
        var subscribeStep = stepMap[subscribe];

        if (!subscribeStep) {
          throw new Error('Subscribe install step does not exist: ' +
            subscribe);
        }

        // Add reverse dependency.
        if (!_.contains(subscribeStep.deps, step.name)) {
          subscribeStep.deps.push(step.name);
        }

        // Loop through all steps to find anything with step as a dependency.
        _.forEach(steps, function(_step) {

          // If _step is dependent on step, and is not the subscribe step.
          if (_.contains(_step.deps, step.name) && _step.name !== subscribe) {

            // Add dependency.
            if (!_.contains(_step.deps, step.name)) {
              _step.deps.push(step.name);
            }

          }

        });

      });

    });

    return steps;

  };

  /*
   * Sort steps by dependencies using a topological sort.
   */
  var sortSteps = function(steps) {

    // Group steps so that first, last, and normal steps are separate.
    var groups = _.groupBy(steps, function(step) {
      if (step.first) {
        return 'first';
      } else if (step.last) {
        return 'last';
      } else {
        return 'normal';
      }
    });

    // Make sure there aren't more than one first or last step.
    var data;
    if (groups.first.length > 1) {
      data = JSON.stringify(groups.first, null, '  ');
      throw new Error('More than one step marked first not allowed: ' + data);
    }
    if (groups.last.length > 1) {
      data = JSON.stringify(groups.last, null, '  ');
      throw new Error('More than one step marked last not allowed: ' + data);
    }

    // Use a topo sort for dependency sorting.
    // Graph to hold dependency tree.
    var graph = tsort();

    // Dictionary for holding steps by name.
    var stepMap = {};

    // Add each step to dependency graph and dictionary.
    groups.normal.forEach(function(step) {
      graph.add([step.name].concat(step.deps));
      stepMap[step.name] = step;
    });

    // Sort the graph and reverse.
    var graphResults = null;
    try {
      graphResults = graph.sort();
    } catch (err) {
      if (_.startsWith(err.message, 'There is a cycle in the graph.')) {
        console.log(steps);
      }
      throw err;
    }
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

    // Return ordered steps with first added to the front, and last added
    // to the back.
    return _.flatten([
      groups.first,
      orderedSteps,
      groups.last
    ]);

  };

  /*
   * Get list of registered install steps, filters, sorts, and validates them.
   */
  var getSteps = function(platform) {
    if (typeof platform !== 'string') {
      throw new TypeError('Invalid platform: ' + platform);
    }

    // Filter out steps without an implementation for given platform.
    var filteredSteps = filterSteps(platform);

    // Preprocess filtered steps.
    var preprocessedSteps = preprocessSteps(filteredSteps);

    // Sort steps based on dependencies.
    var orderedSteps = sortSteps(preprocessedSteps);

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
  var getInstall = function(platform) {
    // @todo: validate all dependencies were found.
    if (!platform) {
      platform = core.env.platform;
    }

    // Validate platform.
    if (typeof platform !== 'string') {
      throw new TypeError('Invalid platform: ' + platform);
    }

    return function(state) {
      var steps = getSteps(platform);
      state.stepCount = steps.length;

      // Loop through each step.
      return Promise.each(steps, function(step) {
        // Build event context.
        var eventContext = {
          step: step,
          state: state
        };
        // Get step function.
        var fn = unpackStep(step, platform);
        if (fn) {
          // Wrap everything in a try, so we can wrap the errors.
          return Promise.try(function() {
            if (fn.length === 1) {
              // Step implementation is synchronous.
              events.emit('pre-step', eventContext);
              fn(state);
              events.emit('post-step', eventContext);
            } else if (fn.length === 2) {
              // Step implementation is asynchronous.
              return Promise.fromNode(function(cb) {
                events.emit('pre-step', eventContext);
                fn(state, cb);
              })
              // Emit post step event.
              .then(function() {
                events.emit('post-step', eventContext);
              });
            } else {
              // Step does not have a valid number of arguments.
              throw new Error('Invalid install step callback: ' +
                fn.toString());
            }
          })
          // Wrap errors.
          .catch(function(err) {
            throw new VError(err, 'Error running step: ' + prettyPrint(step));
          });
        }
      })
      // Emit end event.
      .then(function() {
        events.emit('end', {state: state});
      })
      // Emit error event.
      .catch(function(err) {
        events.emit('error', err);
      });

    };
  };

  // Return API
  return {
    clearSteps: clearSteps,
    events: events,
    getInstall: getInstall,
    getSteps: getSteps,
    registerStep: registerStep
  };

};
