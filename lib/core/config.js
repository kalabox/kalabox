'use strict';

var path = require('path');
var fs = require('fs');
var env = require('./env.js');
var deps = require('./deps.js');

// Constants
var CONFIG_FILENAME = 'kalabox.json';
exports.CONFIG_FILENAME = CONFIG_FILENAME;

var DEFAULT_GLOBAL_CONFIG = {
  domain: 'kbox',
  engine: 'docker',
  kboxRoot: ':home:/kalabox',
  kalaboxRoot: ':kboxRoot:',
  appsRoot: ':kboxRoot:/apps',
  globalPluginRoot: ':kboxRoot:/plugins',
  globalPlugins: [
    'hipache',
    'kalabox_core',
    'kalabox_install',
    'kalabox_app',
    'kalabox_provider'
  ],
  redis: {
    // @todo: Dynamically set this.
    host: '1.3.3.7',
    port: 8160
  },
  // @this needs to be set dynamically once we merge in config.js
  dockerHost: '1.3.3.7',
  dockerPort: '2375'
};

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

exports.getEnvConfig = function() {
  return {
    home: env.getHomeDir(),
    sysConfRoot: env.getSysConfRoot(),
    srcRoot: env.getSourceRoot()
  };
};

exports.getDefaultConfig = function() {
  return mixIn(this.getEnvConfig(), DEFAULT_GLOBAL_CONFIG);
};

var getGlobalConfigFilepath = function() {
  return path.join(env.getSysConfRoot(), CONFIG_FILENAME);
};

var loadConfigFile = function(configFilepath) {
  return require(configFilepath);
};

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

exports.getAppConfig = function(app) {
  // @todo: this is jank
  if (typeof app === 'string') {
    var appName = app;
    app = {name: appName};
  }
  var globalConfig = this.getGlobalConfig();
  var appRoot = path.join(globalConfig.appsRoot, app.name);
  var appConfigFilepath = path.join(appRoot, CONFIG_FILENAME);
  var appConfigFile = require(appConfigFilepath);
  appConfigFile.appRoot = appRoot;
  appConfigFile.appCidsRoot = ':appRoot:/.cids';
  return mixIn(globalConfig, appConfigFile);
};
