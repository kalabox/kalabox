'use strict';

var fs = require('fs');
var path = require('path');
var config = require('./config.js');
var _ = require('lodash');
var Docker = require('dockerode');
var docker = new Docker(config.docker);
var util = require('./util.js');

/**
 * Creates a generic container with the specified options
 * @todo : probably want to wrap other app-specific funcs around
 * this in the future
 */
exports.create = function(copts, callback) {
  docker.createContainer(copts, function(err, data) {
    if (err) {
      throw err;
    }
    if (data) {
      // @todo: we need this to start non-app containers until we have CID-files
      // for startup services
      if (copts.name) {
        var container = {
          cid: data.id,
          name: copts.name
        };
      }
    }
    callback(err, container);
  });
};

/**
 * Starts the container of a specific component.
 */
exports.start = function(cid, sopts, callback) {
  docker.getContainer(cid).start(sopts, function(err, data) {
    callback(err, data);
  });
};

/**
 * Stops the container of a specific component.
 */
exports.stop = function(cid, callback) {
  docker.getContainer(cid).stop(function(err, data) {
    callback(err, data);
  });
};

/**
 * Kills the container of a specific component.
 */
exports.kill = function(cid, callback) {
  docker.getContainer(cid).kill(function(err, data) {
    callback(err, data);
  });
};

/**
 * Removes the container of a specific component.
 */
exports.remove = function(cid, callback) {
  docker.getContainer(cid).remove(function(err, data) {
    callback(err, data);
  });
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
