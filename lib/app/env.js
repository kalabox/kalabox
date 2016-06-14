'use strict';

// Npm modules
var _ = require('lodash');

/*
 * Constructor.
 */
function Env(opts) {
  if (this instanceof Env) {
    opts = opts || {};
    this.opts = opts;
    this.state = _.get(opts, 'state') || {};
  } else {
    return new Env(opts);
  }
}

/*
 * Set environmental variable.
 */
Env.prototype.setEnv = function(key, value) {
  this.state[key] = value;
};

/*
 * Gets either a specific environmental variable or the entire environment.
 */
Env.prototype.getEnv = function(key) {
  if (typeof key === 'undefined') {
    return this.state;
  } else {
    return this.state[key];
  }
};

/*
 * Use an object and namespace to bulk set environmental variables.
 */
Env.prototype.setEnvFromObj = function(data, identifier) {

  var self = this;

  // Prefix our keys with proper namespaces
  var prefix = ['KALABOX'];

  // If we have an additional identifier then add it in
  if (identifier) {
    prefix.push(identifier.toUpperCase());
  }

  // Build our namespace
  var namespace = prefix.join('_');

  _.forEach(data, function(value, key) {
    var envVar = [namespace, _.snakeCase(key).toUpperCase()].join('_');
    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }
    self.setEnv(envVar, value);
  });
};

module.exports = Env;
