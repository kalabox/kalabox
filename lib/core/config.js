/**
 * Module for global and app configs.
 * @module kbox.core.config
 */

'use strict';

var path = require('path');
var os = require('os');
var fs = require('fs');
var env = require('./env.js');
var deps = require('./deps.js');
var log = require('./log.js');
var _ = require('lodash');

// Constants
var CONFIG_FILENAME = 'kalabox.json';
exports.CONFIG_FILENAME = CONFIG_FILENAME;

var DEFAULT_GLOBAL_CONFIG = {
  domain: 'kbox',
  engine: 'kalabox-engine-docker',
  services: 'kalabox-services-kalabox',
  profile: 'standard',
  sharing: true,
  kboxRoot: ':home:/kalabox',
  kalaboxRoot: ':kboxRoot:',
  logLevel: 'debug',
  logLevelConsole: 'info',
  logRoot: ':sysConfRoot:/logs',
  downloadsRoot: ':sysConfRoot:/downloads',
  appsRoot: ':kboxRoot:/apps',
  appRegistry: ':sysConfRoot:/appRegistry.json',
  globalPluginRoot: ':kboxRoot:/plugins',
  globalPlugins: [
    'kalabox-services-kalabox',
    'kalabox-engine-docker',
    'kalabox_core',
    'kalabox_syncthing'
  ],
  configSources: [
    'DEFAULT_GLOBAL_CONFIG'
  ]
};

var logDebug = log.debug;
var logInfo = log.info;

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

// @todo: implement
var KEYS_TO_CONCAT = [
  'configSources'
];

function mixIn(a, b) {
  for (var key in b) {
    var shouldConcat = _.contains(KEYS_TO_CONCAT, key);
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

var getPackageJson = function() {
  return require(path.join(env.getSourceRoot(), 'package.json'));
};

/**
 * Gets the kalabox environment config.
 * @returns {object} config - The kalabox enviroment config.
 * @example
 * var envConfig = kbox.core.config.getEnvConfig();
 * // Print home directory to stdout.
 * console.log(envConfig.home);
 */
exports.getEnvConfig = function() {
  var packageJson = getPackageJson();
  return {
    home: env.getHomeDir(),
    os: {
      type: os.type(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch()
    },
    sysConfRoot: env.getSysConfRoot(),
    sysProviderRoot: env.getSysProviderRoot(),
    srcRoot: env.getSourceRoot(),
    version: packageJson.version,
    configSources: [
      'ENV_CONFIG'
    ]
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

var getReleaseConfigFilepath = exports.getReleaseConfigFilepath = function() {
  return path.join(env.getSourceRoot(), CONFIG_FILENAME);
};

var getGlobalConfigFilepath = function() {
  return path.join(env.getSysConfRoot(), CONFIG_FILENAME);
};

var loadConfigFile = function(configFilepath) {
  var loadedConfigFile = require(configFilepath);
  loadedConfigFile.configSources = [configFilepath];
  return loadedConfigFile;
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
  var filesToLoad = [
    getReleaseConfigFilepath(),
    getGlobalConfigFilepath()
  ];
  var globalConfig = _.reduce(filesToLoad, function(config, fileToLoad) {
    if (fs.existsSync(fileToLoad)) {
      var loadedConfigFile = loadConfigFile(fileToLoad);
      config = mixIn(config, loadedConfigFile);
    }
    return config;
  }, defaultConfig);
  return globalConfig;
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
