'use strict';

/**
 * Kalabox services module.
 * @module services
 */
var services = require('./services/kbox.js');

/**
 * Makes sure the core services are running correctly
 * @arg {object} image - Image object to pull or build.
 * @arg {function} callback - callback(err, data) - Callback called when the image has been built.
 */
exports.init = function(callback) {
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
