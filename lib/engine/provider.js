'use strict';

/**
 * Kalabox defines providers as OS-specific ways to install the underlying
 * dependencies to run the engine specificed in the global config. For example
 * the Docker engine uses the boot2docker provider to install the docker
 * dependencies for Windows and OSX. It also (eventually) will contain another
 * provider for Linux.
 *
 * Kalabox uses the following interface to define methods that a provider must
 * implement to be used.
 *
 * @module kbox.engine.provider
 */

var Promise = require('../promise.js');
var core = require('../core.js');
var _ = require('lodash');

/*
 * Creates a function that always throws an error when executed.
 */
var unimplementedMethod = function(name, funcName) {
  return function() {
    throw new Error('Provider interface method "' +
      funcName +
      '" for provider "' +
      name +
      '" has not been implemented!');
  };
};

/*
 * Creates an uninitialized provider interface.
 */
var getProviderInterface = function(name) {

  // List of properties of the interface.
  var properties = [
    'name',
    'up',
    'down',
    'isInstalled',
    'isUp',
    'isDown',
    'hasTasks',
    'engineConfig',
    'getIp',
    'getServerIps',
    'path2Bind4U',
  ];

  // Reduce list of properties to an uninitialized interface.
  return _.reduce(properties, function(intf, property) {

    // Name should just be set to name, otherwise create dummy function.
    var val = property === 'name' ? name : unimplementedMethod(name, property);

    // Add property to interface.
    intf[property] = val;

    return intf;

  }, {});

};

/*
 * Singleton instance of a provider interface implementation.
 */
var implementation = null;

/*
 * Returns an initialized interface implementation.
 */
var getInstance = function() {

  if (!implementation) {

    // Get provider module from dependencies.
    // @todo: bcauldwell - This is slightly jank, we probably should just be
    // able to pass this value into the module as an argument.
    var providerModule = core.deps.lookup('providerModule');

    // Get an uninitialized interface.
    var intf = getProviderInterface(providerModule.name);

    // Initialize and promisify interface.
    implementation = Promise.promisifyAll(providerModule.init(intf));

  }

  return implementation;

};

/*
 * Get name of provider implementation.
 */
exports.getName = function() {
  return getInstance().name;
};

/**
 * Activates the provider to be in state to run engine commands.
 * @arg {object} options - Options to pass into the provider
 * @arg {function} callback - Callback called after the provider is put into a ready state.
 * @arg {error} callback.error
 * @arg {output} callback.output
 * @example
 * provider.up(function(err, output) {
 *   log.info(output);
 *   next(null);
 * });
 */
exports.up = function(opts, callback) {

  // Argument processing.
  if (!callback && typeof opts === 'function') {
    callback = opts;
    opts = null;
  }

  // Call up.
  return getInstance().upAsync(opts)
  // Return.
  .nodeify(callback);

};

/*exports.up = function(options, callback) {
  var opts = {};
  var cb;
  if (typeof(options) === 'function') {
    cb = options;
  }
  else {
    cb = callback;
    opts = options;
  }
  getInstance().up(opts, cb);
};*/

/**
 * Deactivates the provider.
 * @arg {function} callback - Callback called after the provider is deactivated.
 * @arg {error} callback.error
 * @arg {output} callback.output
 * @example
 * provider.down(function(err, output) {
 *   log.info(output);
 *   callback(null);
 * });
 */
exports.down = function(callback) {

  // Call down.
  return getInstance().downAsync()
  // Return.
  .nodeify(callback);

};

/**
 * Callsback with error or whether the provider has been installed or not.
 * @arg {function} callback - Callback called after the provider is deactivated.
 * @arg {err} callback.err
 * @arg {output} callback.isInstalled
 * @example
 * provider.isInstalled(function(err, isInstalled) {
 *   if (err) {
 *     callback(err);
 *   } else if (!isInstalled) {
 *     callback(makeProviderError('is NOT installed!'));
 *   } else {
 *     isProviderInstalled = true;
 *     callback(null);
 *   }
 * });
 */
exports.isInstalled = function(callback) {

  // Call isIstalled.
  return getInstance().isInstalledAsync()
  // Return.
  .nodeify(callback);

};

/**
 * Callsback with error or whether the provider is activated or not.
 * @arg {function} callback - Callback called after the provider is deactivated.
 * @arg {err} callback.err
 * @arg {output} callback.isUp
 * @example
 * kbox.engine.isUp(function(err, isUp) {
 *   if (err) {
 *     throw err;
 *   } else if (isUp) {
 *     console.log('It is up!');
 *   }
 * });
 */
exports.isUp = function(callback) {

  // Call isUp.
  return getInstance().isUpAsync()
  // Return.
  .nodeify(callback);

};

/**
 * Callsback with error or whether the provider is deactivated or not.
 * @arg {function} callback - Callback called after the provider is deactivated.
 * @arg {err} callback.err
 * @arg {output} callback.isInstalled
 */
exports.isDown = function(callback) {

  // Call isDown.
  return getInstance().isDownAsync()
  // Return.
  .nodeify(callback);

};

/**
 * Callsback with error or whether the provider has tasks to run or not
 * @arg {function} callback - Callback called after the provider is put into a ready state.
 * @arg {error} callback.error
 * @arg {output} callback.output
 * @example
 * if (engine.provider.hasTasks) {
 *   // Tasks
 *   // Start the kalabox engine
 *   tasks.registerTask('up', function(done) {
 *     engine.up(PROVIDER_UP_ATTEMPTS, done);
 *   });
 *
 *   // Stop the kalabox engine
 *   tasks.registerTask('down', function(done) {
 *     engine.down(PROVIDER_DOWN_ATTEMPTS, done);
 *   });
 *
 *   // Events
 *   events.on('post-up', function(done) {
 *     console.log(chalk.green('Kalabox engine has been activated.'));
 *     done();
 *   });
 *
 *   events.on('post-down', function(done) {
 *     console.log(chalk.red('Kalabox engine has been deactivated.'));
 *     done();
 *   });
 * }
 */
exports.hasTasks = function(callback) {

  // Call hasTasks.
  return getInstance().hasTasksAsync()
  // Return.
  .nodeify(callback);

};

/**
 * Callsback with error or with the config needed to instantiate an engine instance.
 * @arg {function} callback - Callback called after an attempt to grab the engine config.
 * @arg {error} callback.error
 * @arg {config} callback.config
 * @example
 * provider.engineConfig(function(err, config) {
 *   if (err) {
 *     callback(err);
 *   }
 *   else {
 *     engine.init(config);
 *     engineHasBeenInit = true;
 *     callback(null);
 *   }
 * });
 */
exports.engineConfig = function(callback) {

  // Call engineConfig.
  return getInstance().engineConfigAsync()
  // Return.
  .nodeify(callback);

};

// @todo: document
exports.getIp = function(callback) {

  // Call getIp.
  return getInstance().getIpAsync()
  // Return.
  .nodeify(callback);

};

/**
 * Callsback with an array of IPs for where the provider is located.
 * @arg {function} callback - Callback called after an attempt to get the providers IPs
 * @arg {config} callback.ips
 * @example
 * provider.getServerIps(function(ips) {
 *   var ipCmds = cmd.buildDnsCmd(ips, KALABOX_DNS_FILE);
 *   adminCmds = adminCmds.concat(ipCmds);
 *   next(null);
 * });
 */
exports.getServerIps = function(callback) {

  // Call getServerIps.
  return getInstance().getServerIpsAsync()
  // Return.
  .nodeify(callback);

};

/**
 * Callsback with a path that has been translated to match up to its location
 * on the provider. For a lot of providers this will likely just return the argument
 * @arg {path} path - The path to be transated
 * @return path - the translated path
 * @example
 * var appRootBind = provider.path2Bind4U(path);
 */
exports.path2Bind4U = function(path) {
  return getInstance().path2Bind4U(path);
};
