/**
 * Module for accessing the kalabox integrations framework.
 *
 * @name integrations
 */

'use strict';

module.exports = function() {

  // NPM modules.
  var _ = require('lodash');
  var VError = require('verror');

  // Kalabox modules.
  var kbox = require('./kbox.js');
  var Integration = require('./integrations/integration.js')(kbox);
  var methodNames = require('./integrations/methodNames.js');

  /*
   * Singleton store for registered integrations.
   */
  var integrations = {};

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

  /**
   * Create new integration class instance and register with singleton map.
   * @memberof integrations
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
    } catch (err) {
      // Wrap errors.
      throw new VError(err, 'Error creating new integration: ' + name);
    }
  };

  /**
   * Return list of integrations, or if a name is given, just return the
   * integration registered under that name.
   * @memberof integrations
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
