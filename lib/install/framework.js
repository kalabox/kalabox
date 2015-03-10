'use strict';

var _ = require('lodash');
var async = require('async');
var core = require('../core.js');

var steps = [];

var intf = {
  name: null,
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

var validKeys = ['name', 'deps', 'all'];

var prettyPrint = function(step) {
  return JSON.stringify(step);
};

var invariant = function(step) {
  if (!step.name) {
    throw new Error('Install step is missing a name: ' +
      prettyPrint(step));
  }
  if (!step.deps || !Array.isArray(step.deps)) {
    throw new Error('Install step with invalid deps: ' +
      prettyPrint(step));
  }
  _.keys(step).forEach(function(key) {
    if (!_.contains(validKeys, key) {
      throw new Error('Install step with invalid key [' + key + ']: ' +
        prettyPrint(step));
    });
  });
  // @todo: validate function tree makes sense
  /*var funs = [];
  var rec = function(node) {
    
  };
  rec(step.all);*/
};

var registerStep = exports.registerStep = function(handler) {
  var step = _.cloneDeep(intf);
  // @todo: if handler doesn't include a callback, treat it as sync.
  handler(step, function() {
    invariant(step);
    steps.push(step);
  });
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
  return filteredSteps;
};

var getInstall = exports.getInstall = function(platform) {
  // @todo: validate all dependencies were found.
  if (!platform) {
    platform = core.env.platform;
  }
  return function(callback) {
    async.eachSeries(getSteps(platform), function(step, next) {
      var fun = unpackStep(step, platform);
      if (!fun) {
        next();
      } else {
        fun(state, next);
      }
    },
    function(err) {
      callback(err, state);
    });
  };
};

/*
registerStep(function(step, done) {
  step.name = 'Download cat!';
  step.deps = ['downloader'];
  step.all.darwin = function(state, next) {
    state.downloader.download('http://catsrkewl.com/tabby4.gif', function(err) {
      next(err);
    });
  };
  done();
});
*/
