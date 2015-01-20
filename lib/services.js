'use strict';

/**
 * Kalabox services module.
 * @module kbox.services
 */

// Start with no implementation
var services = null;

/**
 * Require the correct services module
 * @arg {object} globalConfig - Kalabox global config object.
 * @example
 * var config = kbox.core.config.getGlobalConfig();
 * kbox.services.init(config);
 */
exports.init = function(globalConfig) {
  if (!services) {
    var serviceName = globalConfig.services;
    services = require('./services/' + serviceName + '/' + serviceName + '.js');
  }
};

/**
 * Makes sure the core services are running correctly
 * @arg {object} image - Image object to pull or build.
 * @arg {function} callback - Callback called when the image has been built.
 * @arg {error} callback.error
 */
exports.verify = function(callback) {
  services.verify(callback);
};

/**
 * Pulls or builds the images for our core services
 * @arg {object} image - Image object to pull or build.
 * @arg {function} callback - Callback called when the image has been built.
 * @arg {array} callback.errors - Array of errors from building of services.
 */
exports.install = function(callback) {
  services.install(callback);
};
