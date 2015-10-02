'use strict';

var _ = require('lodash');
var kbox = require('./kbox.js');
var Promise = kbox.Promise;
var VError = require('verror');
var EventEmitter = require('events');
var util = require('util');

/*
 * Constructor for an integration class.
 */
function Integration(opts) {
  // Name of integration.
  this.name = opts.name;
  // Methods for performing standard interface actions.
  this.methods = opts.methods;
}

/*
 * Inherit from event emitter.
 */
util.inherits(Integration, EventEmitter);

/*
 * Emit ask event with question information.
 */
Integration.prototype.ask = function(question) {
  var self = this;
  return Promise.fromNode(function(cb) {
    question.answer = function(response) {
      cb(null, response);
    };
    question.fail = function(err) {
      cb(err);
    };
    self.emit('ask', question);
  });
};

/*
 * Helper function for wrapping standard interface actions.
 */
Integration.prototype._action = function(state, fn) {
  var promise = Promise.try(fn);
  return {
    state: state,
    promise: promise,
    wait: promise.then,
    then: promise.then
  };
};

/*
 * Standard interface action for sites.
 */
Integration.prototype.sites = function() {
  var self = this;
  var state = {
    id: 'sites'
  };
  return self._action(state, function() {
    return self.methods.sites.call(self, state);
  });
};

/*
 * Standard interface action for pull.
 */
Integration.prototype.pull = function(siteName) {
  var self = this;
  var state = {
    id: 'pull'
  };
  return self._action(state, function() {
    return self.methods.pull.call(self, siteName, state);
  });
};

module.exports = function() {

  /*
   * Singleton store for registered integrations.
   */
  var integrations = {};

  /*
   * Names of actions used to build a new interface.
   */
  var methodNames = [
    'pull',
    'sites'
  ];

  /*
   * Create the internals of a new integration class instance.
   */
  var createInternals = function(name, fn) {
    // Init options.
    var opts = {
      name: name,
      methods: {}
    };
    _.each(methodNames, function(methodName) {
      opts.methods[methodName] = function() {
        throw new Error('Method not implemented : ' + methodName);
      };
    });
    // Give options to callback function for decoration.
    fn(opts);
    // Return options.
    return opts;
  };

  /*
   * Create new integration class instance and register with singleton map.
   */
  var create = function(name, fn) {
    try {
      // Create options.
      var opts = createInternals(name, fn);
      // Create new integration instance.
      var newIntegration = new Integration(opts);
      // Get key to register with.
      var key = newIntegration.name;
      // Ensure this integration isn't already registered.
      if (integrations[key]) {
        throw new Error('Integration already exists: ' + key);
      }
      // Register integration.
      integrations[key] = newIntegration;
      // Return integration.
      return newIntegration;
    } catch(err) {
      // Wrap errors.
      throw new VError(err, 'Error creating new integration: ' + name);
    }
  };

  /*
   * Return list of integrations, or if a name is given, just return the
   * integration registered under that name.
   */
  var get = function(name) {
    if (name) {
      // Find integration by name.
      var result = integrations[name];
      if (!result) {
        throw new Error('Integration does not exist: ' + name);
      }
      return result;
    } else {
      // Return entire singleton integration map.
      return integrations;
    }
  };

  /*
   * Return api.
   */
  return {
    create: create,
    get: get
  };

};
