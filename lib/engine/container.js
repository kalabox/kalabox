'use strict';

var fs = require('fs');
var path = require('path');
var config = require('../config.js');
var _ = require('lodash');
var Docker = require('dockerode');
var docker = new Docker(config.docker);
var util = require('../util.js');

/**
 * This is our single route into the thing running our infrastructure
 */
var engineOpt = function(object, op, args) {
  //@todo: wrap some events around this motha
  var fn = object[op];
  fn.apply(object, args);
};

/*
 * A generic method that will one day allow for more than dockerode
 */
var getContainer = function(cid) {
  return docker.getContainer(cid);
};

/*
 * A generic method that will one day allow for more than dockerode
 */
var getCreator = function() {
  return docker;
};

/*
 * A generic method that will one day allow for more than dockerode
 */
var getDefaultArgs = function(callback) {
  var args = [
    function(err, data) {callback(err, data);}
  ];
  return args;
};

/**
 * Creates a generic container with the specified options
 * @todo : probably want to wrap other app-specific funcs around
 * this in the future
 */
exports.create = function(copts, callback) {
  var args = [
    copts,
    function(err, data) {
      if (err) {
        throw err;
      }
      var container = {};
      if (data) {
        // @todo: we need this to start non-app containers until we have CID-files
        // for startup services
        if (copts.name) {
          container = {
            cid: data.id,
            name: copts.name
          };
        }
      }
      callback(err, container);
    }
  ];
  engineOpt(getCreator(), 'createContainer', args);
};

/**
 * Starts the container of a specific component.
 */
exports.start = function(cid, sopts, callback) {
  var args = getDefaultArgs(callback);
  args.unshift(sopts);
  engineOpt(getContainer(cid), 'start', args);
};

/**
 * Stops the container of a specific component.
 */
exports.stop = function(cid, callback) {
  engineOpt(getContainer(cid), 'stop', getDefaultArgs(callback));
};

/**
 * Kills the container of a specific component.
 */
exports.kill = function(cid, callback) {
  engineOpt(getContainer(cid), 'kill', getDefaultArgs(callback));
};

/**
 * Removes the container of a specific component.
 */
exports.remove = function(cid, callback) {
  engineOpt(getContainer(cid), 'remove', getDefaultArgs(callback));
};

/**
 * @todo: this probably needs to go somewhere else for now but i am unsure where
 * @bcauldwell may know the answer.
 */
exports.name = {
  _USER_DEFINED_PREFIX: 'kb',
  _BUILT_IN_PREFIX: 'kalabox',
  createUserDefined: function(appName, componentName) {
    return util.name.create([this._USER_DEFINED_PREFIX, appName, componentName]);
  },
  createBuiltIn: function(appName, componentName) {
    return util.name.create([this._BUILT_IN_PREFIX, appName, componentName]);
  },
  parse: function(name) {
    // remove white space from front of container name
    var _name = name[0] === ' ' || name[0] === '/' ? name.substring(1) : name;
    var parts = util.name.parse(_name);
    if (parts === null) {
      return null;
    } else {
      return {
        prefix: parts[0],
        appName: parts[1],
        componentName: parts[2]
      };
    }
  },
  isUserDefined: function(parsed) {
    return parsed.prefix === this._USER_DEFINED_PREFIX;
  },
  isBuiltIn: function(parsed) {
    return parsed.prefix === this._BUILT_IN_PREFIX;
  },
  isKalaboxName: function(parsed) {
    return this.isUserDefined(parsed) || this.isBuiltIn(parsed);
  }
};
