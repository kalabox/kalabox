'use strict';

module.exports = function(kbox) {

  // NPM modules.
  var _ = require('lodash');
  var VError = require('verror');

  // Kalabox modules.
  var ActionContext = require('./actionContext.js')(kbox);
  var Promise = kbox.Promise;

  /*
   * Names of actions used to build a new interface.
   */
  var methodNames = require('./methodNames.js');

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
   * Returns true if method named provided is valid.
   */
  Integration.isValidMethodName = function(methodName) {
    return _.contains(methodNames, methodName);
  };

  /*
   * Returns method associated with the name provided.
   */
  Integration.prototype.getMethod = function(methodName) {
    var self = this;
    var method = self.methods[methodName];
    if (!method) {
      throw new Error('No method found: ' + methodName);
    }
    if (typeof method !== 'function') {
      throw new Error('Invalid method function: ' + method);
    }
    return method;
  };

  /*
   * Set method.
   */
  Integration.prototype.setMethod = function(methodName, fn) {
    var self = this;
    if (!Integration.isValidMethodName(methodName)) {
      throw new Error('Invalid integration method name: ' + methodName);
    }
    self.methods[methodName] = fn;
  };

  /*
   * Create an action from a method name and return an action context.
   */
  Integration.prototype.action = function(methodName/*, arg1, arg2*/) {
    var self = this;
    var context = new ActionContext({
      method: self.getMethod(methodName),
      state: null
    });
    return context;
  };

  /*
   * Standard interface action for authorizing a login.
   */
  Integration.prototype.auth = function(username, password) {
    return this.action('auth');
  };

  /*
   * Standard interface action for sites.
   */
  Integration.prototype.sites = function() {
    return this.action('sites');
  };

  /*
   * Standard interface action for pull.
   */
  Integration.prototype.pull = function(siteName) {
    return this.action('pull', siteName);
  };

  return Integration;

};
