'use strict';

var _ = require('lodash');
var async = require('async');
var core = require('../core.js');
var EventEmitter = require('events').EventEmitter;

var steps = [];

var events = exports.events = new EventEmitter();

var intf = {
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
  }
};

var state = {
  foo: 'bar'
};

var prettyPrint = function(step) {
  return JSON.stringify(step);
};

var validKeys = ['name', 'description', 'deps', 'all'];

var invariant = function(step) {
  if (!step.name || typeof step.name !== 'string') {
    throw new Error('Install step has an invalid name: ' +
      prettyPrint(step));
  }
  if (!step.description || typeof step.description !== 'string') {
    throw new Error('Install step has an invalid description: ' +
      prettyPrint(step));
  }
  if (!step.deps || !Array.isArray(step.deps)) {
    throw new Error('Install step with invalid deps: ' +
      prettyPrint(step));
  }
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

var registerStep = exports.registerStep = function(handler) {
  var step = _.cloneDeep(intf);
  // If handler doesn't include a callback, treat it as sync.
  if (handler.length === 1) {
    handler(step);
    invariant(step);
    steps.push(step);
  } else if (handler.length === 2) {
    handler(step, function() {
      invariant(step);
      steps.push(step);
    });
  } else {
    throw new Error('Invalid install step registration handler: ' +
      handler.toString());
  }
};

var clearSteps = exports.clearSteps = function() {
  steps = [];
};

var requires = function(x, y) {
  // Does x require y?
  return _.contains(x.deps, y.name);
};

var compareSteps = function(x, y) {
  if (requires(x, y)) {
    return 1;
  } else if (requires(y, x)) {
    return -1;
  } else {
    return 0;
  }
};

var unpackStep = function(step, platform) {
  if (!platform) {
    throw new Error('Invalid platform: ' + platform);
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

var filterSteps = function(platform) {
  if (!platform) {
    throw new Error('Invalid platform: ' + platform);
  }

  return _.filter(steps, function(step) {
    return unpackStep(step, platform) !== null;
  });
};

var getSteps = exports.getSteps = function(platform) {
  if (!platform) {
    throw new Error('Invalid platform: ' + platform);
  }

  var filteredSteps = filterSteps(platform);
  filteredSteps.sort(compareSteps);

  // Validate all dependencies are included.
  var names = [];
  // First pass to build list of names.
  filteredSteps.forEach(function(step) {
    var exists = _.contains(names, step.name);
    if (exists) {
      throw new Error('Duplicate install step name [' + step.name + '].');
    } else {
      names.push(step.name);
    }
  });
  // Validate dependencies are included.
  filteredSteps.forEach(function(step) {
    step.deps.forEach(function(dep) {
      if (!_.contains(names, dep)) {
        throw new Error('Install step dependency [' + dep + ']' +
          ' was referenced but not included in list of install steps.');
      }
    });
  });
  return filteredSteps;
};

var getInstall = exports.getInstall = function(platform) {
  // @todo: validate all dependencies were found.
  if (!platform) {
    platform = core.env.platform;
  }
  return function(callback) {
    async.eachSeries(getSteps(platform), function(step, next) {
      var fn = unpackStep(step, platform);
      if (!fn) {
        next();
      } else {
        if (fn.length === 1) {
          events.emit('pre-step', step);
          fn(state);
          events.emit('post-step', step);
          next();
        } else if (fn.length === 2) {
          events.emit('pre-step', step);
          fn(state, function(err) {
            events.emit('post-step', step);
            next(err);
          });
        } else {
          var err = new Error('Invalid install step callback: ' +
            fn.toString());
          next(err);
        }
      }
    },
    function(err) {
      callback(err, state);
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
