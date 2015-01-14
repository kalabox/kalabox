'use strict';

/**
 * Kalabox services module.
 * @module services
 */

// Start with no implementation
var services = null;

/**
 * Require the correct services module
 */
exports.init = function(globalConfig) {
  if (!services) {
    services = require('./services/' + globalConfig.services + '.js');
  }
};

/**
 * Makes sure the core services are running correctly
 * @arg {object} image - Image object to pull or build.
 * @arg {function} callback - callback(err, data) - Callback called when the image has been built.
 */
exports.verify = function(callback) {
  callback(null);
};

/**
 * Pulls or builds the images for our core services
 * @arg {object} image - Image object to pull or build.
 * @arg {function} callback - callback(err, data) - Callback called when the image has been built.
 */
exports.install = function(callback) {
  services.install(callback);
};
