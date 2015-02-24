/**
 * Module for global and app configs.
 * @module kbox.core.config
 */

'use strict';

var path = require('path');
var fs = require('fs');
var env = require('./env.js');
var deps = require('./deps.js');
var log = require('./log.js');

// Constants
var CONFIG_FILENAME = 'kalabox.json';
exports.CONFIG_FILENAME = CONFIG_FILENAME;

var DEFAULT_GLOBAL_CONFIG = {
  domain: 'kbox',
  engine: 'docker',
  services: 'kalabox',
  kboxRoot: ':home:/kalabox',
  codeRoot: ':kboxRoot:/code',
  kalaboxRoot: ':kboxRoot:',
  logLevel: 'debug',
  logLevelConsole: 'info',
  logRoot: ':sysConfRoot:/logs',
  appsRoot: ':kboxRoot:/apps',
  appRegistry: ':sysConfRoot:/appRegistry.json',
  globalPluginRoot: ':kboxRoot:/plugins',
  globalPlugins: [
    'kalabox_hipache',
    'kalabox_core',
    'kalabox_install',
    'kalabox_app',
    'kalabox_provider',
    'kalabox_syncthing'
  ]
};

var logDebug = log.debug;
var logInfo = log.info;

// @todo: implement
//var KEYS_TO_CONCAT = {};

function normalizeValue(key, config) {
  var rawValue = config[key];
  if (typeof rawValue === 'string') {
    var params = rawValue.match(/:[a-zA-Z0-9-_]*:/g);
    if (params !== null) {
      for (var index in params) {
        var param = params[index];
        var paramKey = param.substr(1, param.length - 2);
        var paramValue = config[paramKey];
        if (paramValue !== undefined) {
          config[key] = rawValue.replace(param, paramValue);
        }
      }
    }
  }
}
exports.normalizeValue = normalizeValue;

function normalize(config) {
  for (var key in config) {
    normalizeValue(key, config);
  }
  return config;
}
exports.normalize = normalize;

function sort(config) {
  var keys = Object.keys(config).sort();
  var retVal = {};
  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];
    retVal[key] = config[key];
  }
  return retVal;
}

function mixIn(a, b/*, keysToConcat*/) {
  /*if (!keysToConcat) {
    keysToConcat = KEYS_TO_CONCAT;
  }*/
  for (var key in b) {
    //var shouldConcat = keysToConcat[key] !== undefined;
    var shouldConcat = false;
    if (shouldConcat) {
      // Concat.
      if (a[key] === undefined) {
        a[key] = b[key];
      } else {
        a[key] = a[key].concat(b[key]);
      }
    } else {
      // Override.
      a[key] = b[key];
    }
  }
  return sort(normalize(a));
}
exports.mixIn = mixIn;

/**
 * Gets the kalabox environment config.
 * @returns {object} config - The kalabox enviroment config.
 * @example
 * var envConfig = kbox.core.config.getEnvConfig();
 * // Print home directory to stdout.
 * console.log(envConfig.home);
 */
exports.getEnvConfig = function() {
  return {
    home: env.getHomeDir(),
    sysConfRoot: env.getSysConfRoot(),
    sysProviderRoot: env.getSysProviderRoot(),
    srcRoot: env.getSourceRoot()
  };
};

/**
 * Gets the default config. The default config is a combination of the
 *   environment config and a set of default config values.
 * @returns {object} config - The kalabox default config.
 * @example
 * var defaultConfig = kbox.core.config.getDefaultConfig();
 * // Print global plugins
 * defaultConfig.globalPlugins.forEach(function(plugin) {
 *   console.log(plugin)  ;
 * });
 */
exports.getDefaultConfig = function() {
  return mixIn(this.getEnvConfig(), DEFAULT_GLOBAL_CONFIG);
};

var getGlobalConfigFilepath = function() {
  return path.join(env.getSysConfRoot(), CONFIG_FILENAME);
};

var loadConfigFile = function(configFilepath) {
  return require(configFilepath);
};

/**
 * Gets the global config. The global config is a combination of the
 *   environment config, the default config, and any values overriden
 *   in the $HOME/.kalabox/kalabox.json config file.
 * @returns {object} config - The kalabox global config.
 * @example
 * var globalConfig = kbox.core.config.getGlobalConfig();
 * // Print the entire global config.
 * console.log(JSON.stringify(globalConfig, null, '\t'));
 */
exports.getGlobalConfig = function() {
  var defaultConfig = this.getDefaultConfig();
  var globalConfigFilepath = getGlobalConfigFilepath();
  if (fs.existsSync(globalConfigFilepath)) {
    var globalConfigFile = loadConfigFile(globalConfigFilepath);
    return mixIn(defaultConfig, globalConfigFile);
  } else {
    return defaultConfig;
  }
};

exports.getAppConfigFilepath = function(app, config) {
  return path.join(config.appsRoot, app.name, CONFIG_FILENAME);
};

/**
 * Gets the app config for an app. The app config is a combination of the
 *   environment config, the default config, any values overriden in the
 *   $HOME/.kalabox/kalabox.json config file, and the kalabox.json config
 *   file in the app's root directory.
 * @arg {string} app - The name of the app you'd like to get the config for.
 * @returns {object} config - The app's kalabox app config.
 * @example
 * var appConfig = kbox.core.config.getAppConfig('myapp');
 * // Print the entire app config.
 * console.log(JSON.stringify(appConfig, null, '\t'));
 */
exports.getAppConfig = function(app, appRoot) {
  // @todo: this is jank
  if (typeof app === 'string') {
    var appName = app;
    app = {name: appName};
  }

  var globalConfig = this.getGlobalConfig();

  if (!appRoot) {
    appRoot = path.join(globalConfig.appsRoot, app.name);
  }

  var appConfigFilepath = path.join(appRoot, CONFIG_FILENAME);
  var appConfigFile = require(appConfigFilepath);
  appConfigFile.appRoot = appRoot;
  appConfigFile.appCidsRoot = ':appRoot:/.cids';
  var retVal = mixIn(globalConfig, appConfigFile);
  logDebug('CONFIG => App config loaded.', retVal);
  return retVal;
};
