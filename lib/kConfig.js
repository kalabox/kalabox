'use strict';

var path = require('path');
var fs = require('fs');
var kEnv = require('./kEnv.js');
var deps = require('./deps.js');

// Constants
var CONFIG_FILENAME = 'kalabox.json';
module.exports.CONFIG_FILENAME = CONFIG_FILENAME;

var DEFAULT_GLOBAL_CONFIG = {
  domain: 'kbox',
  kboxRoot: ':home:/kalabox',
  kalaboxRoot: ':kboxRoot:',
  appsRoot: ':kboxRoot:/apps',
  sysConfRoot: ':home:/.kalabox',
  globalPluginRoot: ':kboxRoot:/plugins',
  globalPlugins: ['kalabox']
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
module.exports.normalizeValue = normalizeValue;

function normalize(config) {
  for (var key in config) {
    normalizeValue(key, config);
  }
  return config;
}
module.exports.normalize = normalize;

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
  return normalize(a);
}
module.exports.mixIn = mixIn;

module.exports.getEnvConfig = function() {
  return {
    home: kEnv.getHomeDir(),
    srcRoot: kEnv.getSourceRoot()
  };
};

module.exports.getDefaultConfig = function() {
  return mixIn(this.getEnvConfig(), DEFAULT_GLOBAL_CONFIG);
};

var getGlobalConfigFilepath = function() {
  return path.join(kEnv.getKalaboxRoot(), CONFIG_FILENAME);
};

var loadConfigFile = function(configFilepath) {
  return require(configFilepath);
};

module.exports.getGlobalConfig = function() {
  var defaultConfig = this.getDefaultConfig();
  var globalConfigFilepath = getGlobalConfigFilepath();
  if (fs.existsSync(globalConfigFilepath)) {
    var globalConfigFile = loadConfigFile(globalConfigFilepath);
    return mixIn(defaultConfig, globalConfigFile);
  } else {
    return defaultConfig;
  }
};

module.exports.getAppConfigFilepath = function(app, config) {
  return path.join(config.appsRoot, app.name, CONFIG_FILENAME);
};

module.exports.getAppConfig = function(app) {
  var globalConfig = this.getGlobalConfig();
  var appRoot = path.join(globalConfig.appsRoot, app.name);
  var appConfigFilepath = path.join(appRoot, CONFIG_FILENAME);
  var appConfigFile = require(appConfigFilepath);
  appConfigFile.appRoot = appRoot;
  appConfigFile.appCidsRoot = ':appRoot:/cids';
  return mixIn(globalConfig, appConfigFile);
};
