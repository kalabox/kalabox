'use strict';

/**
 * Kalabox allows the spin up of additional containers that may be needed to
 * support apps running correctly. By default Kalabox ships with a default
 * set of services, called "kalabox" to allow for better intra-container
 * communication and reverse proxying.
 *
 * Kalabox uses the following interface which the default set of services
 * implements. You can easily define your own set of services using the default
 * ones as an example. To do so you will want to edit your global config file
 * to change the services key with your own and then add a folder and modules
 * into the services folder using the name set in the global config. For example
 * if you are using 'kalabox' as your set of services then you would expect to
 * see a folder named 'kalabox' in the services folder and a module named
 * kalabox.js
 *
 * @module kbox.services
 */

var Promise = require('./promise.js');

/*
 * Singleton instance of services.
 */
var servicesInstance = null;

/**
 * Loads the corrects services module based on the value of the 'services' key
 * in the global config.
 * @arg {object} globalConfig - Kalabox global config object.
 * @example
 * var DEFAULT_GLOBAL_CONFIG = {
 *   domain: 'kbox',
 *   engine: 'docker',
 *   services: 'MYSERVICE',
 *   kboxRoot: ':home:/kalabox',
 *   kalaboxRoot: ':kboxRoot:',
 *   appsRoot: ':kboxRoot:/apps',
 *   globalPluginRoot: ':kboxRoot:/plugins',
 *   globalPlugins: [
 *     'hipache',
 *     'kalabox_core',
 *     'kalabox_install',
 *     'kalabox_app',
 *     'kalabox_provider'
 *   ]
 * };
 */
exports.init = function(globalConfig, kbox, callback) {
  // @todo: bcauldwell - Maybe globalConfig should be gotten from the
  // dependencies list instead of being passed in.

  // Start a promise.
  return Promise.try(function() {
    if (!servicesInstance) {
      // Load services module.
      return kbox.require(globalConfig.services)
      // Set singleton cache.
      .then(function(mod) {
        // @todo: @bcauldwell - Promisify the services module.
        servicesInstance = Promise.promisifyAll(mod);
      });
    }
  })
  // Return.
  .nodeify(callback);

};

/**
 * Makes sure that the services module has all their containers up and running
 * before an app is started or stopped.
 * @arg {function} callback - Callback called when the services have been started.
 * @arg {error} callback.error
 * @example
 * services.verify(function(err) {
 *   if (err) {
 *     callback(err);
 *   }
 *   else {
 *     someFunctionThatDoesAppThingsThatRequireServicesToBeStarted();
 *   }
 * });
 */
exports.verify = function(callback) {
  // Verify.
  return servicesInstance.verifyAsync()
  // Return.
  .nodeify(callback);
};

/**
 * Installs and creates all the containers needed for the services
 * @arg {function} callback - Callback called when the services have been installed and created.
 * @arg {array} callback.errors - Array of errors from installing of services.
 * @example
 * services.install(function() {
 *   log.info('Core services installed.');
 *     next(null);
 *   });
 * }
 */
exports.install = function(callback) {
  // Install.
  return servicesInstance.install()
  // Return.
  .nodeify(callback);
};
