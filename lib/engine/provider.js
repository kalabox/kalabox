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

var core = require('../core.js');

var unimplementedMethod = function(name, funcName) {
  return function() {
    throw new Error('Provider interface method "' +
      funcName +
      '" for provider "' +
      name +
      '" has not been implemented!');
  };
};

var getProviderInterface = function(name) {
  var intf = {
    name: name
  };
  [
    'up',
    'down',
    'isInstalled',
    'isUp',
    'isDown',
    'hasTasks',
    'engineConfig',
    'getServerIps',
  ].forEach(function(x) {
    intf[x] = unimplementedMethod(name, x);
  });
  return intf;
};

var implementation = null;

var getInstance = function() {
  if (!implementation) {
    core.deps.call(function(providerModule) {
      var intf = getProviderInterface(providerModule.name);
      implementation = providerModule.init(intf);
    });
  }
  return implementation;
};

/**
 * Activates the provider to be in state to run engine commands.
 * @arg {function} callback - Callback called after the provider is put into a ready state.
 * @arg {error} callback.error
 * @arg {output} callback.output
 * @example
 * provider.up(function(err, output) {
 *   log.info(output);
 *   next(null);
 * });
 */
exports.up = function(callback) {
  getInstance().up(callback);
};

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
  getInstance().down(callback);
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
  getInstance().isInstalled(callback);
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
  getInstance().isUp(callback);
};

/**
 * Callsback with error or whether the provider is deactivated or not.
 * @arg {function} callback - Callback called after the provider is deactivated.
 * @arg {err} callback.err
 * @arg {output} callback.isInstalled
 */
exports.isDown = function(callback) {
  getInstance().isDown(callback);
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
  getInstance().hasTasks(callback);
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
  getInstance().engineConfig(callback);
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
  getInstance().getServerIps(callback);
};
