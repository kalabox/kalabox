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
  engine: 'kalabox-engine-docker@https://github.com/kalabox/' +
    'kalabox-engine-docker/tarball/master',
  engineRepo: 'kalabox',
  codeDir: 'code',
  services: 'kalabox-services-kalabox@https://github.com/kalabox/' +
    'kalabox-services-kalabox/tarball/master',
  apps: [
    'kalabox-app-drupal@https://github.com/kalabox/' +
      'kalabox-app-drupal/tarball/master',
    'kalabox-app-backdrop@https://github.com/kalabox/' +
      'kalabox-app-backdrop/tarball/master',
    'kalabox-app-pantheon@https://github.com/kalabox/' +
      'kalabox-app-pantheon/tarball/master'
  ],
  profile: 'standard',
  sharing: true,
  stats: {
    report: true,
    url: 'http://stats.kalabox.biz'
  },
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
    'kalabox-core',
    'kalabox-dev',
    'kalabox-syncthing',
    'kalabox-app-drupal',
    'kalabox-app-backdrop',
    'kalabox-app-pantheon'
  ],
  configSources: [
    'DEFAULT_GLOBAL_CONFIG'
  ],
  shareIgnores: [
    '*.7z',
    '*.bz2',
    '*.dmg',
    '*.gz',
    '*.iso',
    '*.jar',
    '*.rar',
    '*.tar',
    '*.tgz',
    '*.un~',
    '*.zip',
    '.*.swp',
    '.*DS_Store',
    '.DS_Store*',
    '._*',
    '.sass-cache',
    'Icon',
    'Thumbs.db',
    'ehthumbs.db'
  ]
};

var logDebug = log.debug;
var logInfo = log.info;

/*
 * Pretty print an object.
 */
var pp = function(obj) {
  return JSON.stringify(obj, null, '  ');
};

/*
 * Looks up a key of the config object and returns it.
 */
var lookupKey = function(config, keyToFind) {

  // Recursive function.
  var rec = function(o, prefix) {

    // Loop through each of the objects properties to find value.
    return _.find(o, function(val, key) {

      // Build namespaced name.
      var name = _.filter([prefix, key]).join('.');

      if (typeof val === 'string') {

        // If name of string value matches, return it.
        return (':' + name + ':') === keyToFind;

      } else if (typeof val === 'object') {

        // Recursively check object.
        return rec(val, name);

      } else {

        // Not a string or an object so just return false.
        return false;

      }

    });

  };

  // Init recursive function and return.
  return rec(config);

};

/*
 * Translate a value.
 */
var normalizeValue = exports.normalizeValue = function(config, v) {

  // Search value for regex matches.
  //var params = v.match(/:[a-zA-Z0-9-_]*:/g);
  var params;
  try {
    params = v.match(/:[a-zA-Z0-9-_]*:/g);
  }
  catch (err) {
    throw new Error(typeof v);
  }

  if (!params) {

    // No params were found, so just return original value.
    return v;

  } else {

    // Reduce list of params to final value.
    return _.reduce(params, function(acc, param) {

      // Get replacement value from config object based on param name.
      var replacementValue = lookupKey(config, param);

      if (!replacementValue) {

        // Replacement value was not found so just return value.
        return acc;

      } else {

        // Replace and return.
        return acc.replace(param, replacementValue);

      }

    }, v);

  }

};

/*
 * Walk the properties of the top level object, replacing strings
 * with other properties values.
 */
var normalize = exports.normalize = function(config) {

  // Recursive funciton.
  var rec = function(o) {

    // Loop through each property of the object.
    _.each(o, function(val, key) {

      if (typeof val === 'string') {

        // For string values normalize.
        o[key] = normalizeValue(config, val);

      } else if (typeof val === 'object') {

        // For object values recursively normalize.
        rec(val);

      }

    });

  };

  // Init recursive function with config.
  rec(config);

  // Return config.
  return config;

};

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
  'configSources',
  'shareIgnores'
];

function mixIn(a, b) {
  for (var key in b) {
    var shouldConcat = _.contains(KEYS_TO_CONCAT, key);
    if (shouldConcat) {
      // Concat.
      if (_.isArray(a[key]) && _.isArray(b[key])) {
        a[key] = _.uniq(a[key].concat(b[key]));
        a[key].sort();
      } else {
        a[key] = b[key];
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
  var provisioned = false;
  if (fs.existsSync(path.join(env.getSysConfRoot(), 'provisioned'))) {
    provisioned = true;
  }
  return {
    devMode: env.getDevMode(),
    provisioned: provisioned,
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
 * @arg {string} appRoot [optional] - Directory to load the
 * app's config file from.
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
  var appConfigOverride = function(key, val) {
    if (!appConfigFile[key]) {
      appConfigFile[key] = val;
    }
  };

  appConfigOverride('appRoot', appRoot);
  appConfigOverride('appCidsRoot', ':appRoot:/.cids');
  appConfigOverride('codeRoot', ':appRoot:/:codeDir:');
  var retVal = mixIn(globalConfig, appConfigFile);
  logDebug('CONFIG => App config loaded.', retVal);
  return retVal;
};
