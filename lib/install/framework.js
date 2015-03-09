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

var registerStep = exports.registerStep = function(handler) {
  var step = _.cloneDeep(intf);
  handler(step, function() {
    // @todo: validate step
    // @todo: validate name is set
    // @todo: validate function tree makes sense
    steps.push(step);
  });
};

var requires = function(x, y) {
  // Does x require y?
  return _.contains(x.deps, y.name);
};

var compareSteps = function(x, y) {
  // @todo: implement
  if (requires(x, y)) {
    return -1;
  } else if (requires(y, x)) {
    return 1;
  } else {
    return 0;
  }
};

var getSteps = function() {
  steps.sort(compareSteps);
  return steps;
};

var unpackStep = function(platform, step) {
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

var getInstall = exports.getInstall = function() {
  var platform = core.env.platform;
  return function(callback) {
    async.eachSeries(getSteps(), function(step, next) {
      var fun = unpackStep(platform);
      if (!fun) {
        next();
      } else {
        fun(state, next);
      }
    },
    function(err) {
      callback(err);
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
