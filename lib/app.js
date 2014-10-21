'use strict';

var EventEmitter = require("events").EventEmitter;
var fs = require('fs');
var path = require('path');
var util = require("util");

var _ = require('lodash');
var vasync = require('vasync');

var cmp = require('./component.js');


var App = function(manager, appPath) {
  var _this = this;
  this.path = appPath;

  // Setup event emitter & public handler
  EventEmitter.call(this);
  this.event = function(key, obj) {
    _this.emit(key, obj);
  };

  // Setting these so plugins can access docker and kconfig.
  // TODO: Evaluate if there's a better way
  this.manager = manager;
  // break out for easier access
  this.kconfig = manager.kconfig;
  this.docker = manager.docker;

  // Load/set config, components, plugins, & data paths
  loadConfig(this);
  loadComponents(this);
  loadPlugins(this);
  setDataPath(this);
};

util.inherits(App, EventEmitter);

/**
 * Loads static config + dynamic elements into the app object.
 */
var loadConfig = function(app) {
  app.tasks = {};

  // TODO: Validate config location
  app.profilePath = path.resolve(app.path, '.kalabox');
  if (!fs.existsSync(app.profilePath)) {
    throw  new Error("File does not exist: " + app.profilePath);
  }
  var configFile = path.resolve(app.profilePath, 'profile.json');
  if (!fs.existsSync(configFile)) {
    throw  new Error("File does not exist: " + configFile);
  }
  // Load config
  app.config = require(configFile);

  // Validate name
  if (!app.config.name) {
    throw new Error('App config must define a name.');
  }
  // Valid app names are alphanumeric + hyphen, beginning with a letter, lower case, 3 to 9 characters.
  var re = /^[0-9a-z\-]{3,9}$/;
  if (!re.test(app.config.name)) {
    throw new Error('App name property must begin with a letter and contain 3 to 9 lowercase letters, numbers, and hyphens.');
  }
  // Set name based properties
  app.name = app.config.name;
  app.appdomain = app.name + '.' + app.kconfig.domain;
  app.dataPath = path.resolve(app.kconfig.appDataPath, app.name);
  app.cidPath = path.resolve(app.dataPath, 'cids');
  app.url = 'http://' + app.appdomain;
  app.prefix = app.name + '_';

  // Validate components exist
  if (!app.config.components) {
    throw new Error('App config must contain at least 1 component.');
  }
  // Set data component for special handling
  app.hasData = app.config.components.hasOwnProperty('data');
  app.dataCname = app.hasData ? 'kb_' + app.prefix + 'data' : null;
};

var loadComponents = function(app) {
  // Set more properties for each component
  app.components = {};
  _.map(app.config.components, function(component, key) {
    app.components[key] = new cmp.Component(app, key, component);
  });
};

/**
 * Loads plugins defined by app. The application has the
 * opportunity to override default plugins by re-defining
 * plugins of the same name.
 *
 * Plugins will be loaded from plugin.path if defined. The
 * path will first look for an existing path in the application,
 * then ~/.kalabox, and finally in the source/plugins directory.
 */
var loadPlugins = function(app) {
  app.plugins = {};
  if (!app.config.plugins) {
    app.config.plugins = {};
  }

  // Load global plugins into the manager if defined.
  if (app.config.plugins.global) {
    _.map(app.config.plugins.global, function(plugin, key) {
      loadPlugin(plugin, key, app, 'global');
    });
  }

  // If app.config.plugins.app doesn't exist,
  // use app.config.plugins as the app plugins.
  var plugins = app.kconfig.plugins.app;
  var appPlugins = app.config.plugins.app ?  app.config.plugins.app :  app.config.plugins;
  _(appPlugins).each(function(plugin, key) {
    plugins[key] = plugin;
  });

  // Load up app defined plugins
  _.map(plugins, function(plugin, key) {
    loadPlugin(plugin, key, app, 'app');
  });
};

/**
 * Loads an individual plugin into the app manager.
 *
 * @param plugin config object
 * @param key config key
 * @param app app object
 * @param context global or app
 */
var loadPlugin = function(plugin, key, app, context) {
  plugin.key = key;
  var pluginPath = 'plugins/' + key;
  if (plugin.path) {
    pluginPath = plugin.path + '/' + key;
  }
  var src = loadPath(app, pluginPath);
  if (src !== false) {
    if (context == 'global') {
      app.manager.plugins[key] = require(src)(plugin, app.manager);
    }
    else {
      app.manager.plugins[key] = require(src)(plugin, app.manager, app);
    }
  }
};

/**
 * Sets up the kalabox app data directory
 * i.e. ~/.kalabox/apps/<appname>/cids
 */
var setDataPath = function(app) {
  if (!fs.existsSync(app.kconfig.dataPath)) {
    fs.mkdirSync(app.kconfig.dataPath);
  }
  if (!fs.existsSync(app.kconfig.appDataPath)) {
    fs.mkdirSync(app.kconfig.appDataPath);
  }
  var appPath = path.resolve(app.kconfig.appDataPath, app.name);
  if (!fs.existsSync(appPath)) {
    fs.mkdirSync(appPath);
  }
  var cidPath = path.resolve(appPath, 'cids');
  if (!fs.existsSync(cidPath)) {
    fs.mkdirSync(cidPath);
  }
};

/**
 * Fetches a valid path based on a given relative path.
 * - First looks relative to the .kalabox directory
 * - Second looks relative to the ~/.kalabox directory
 * - Third looks relative to the Kalabox source
 */
var loadPath = function(app, relativePath) {
  var src = path.resolve(app.profilePath, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  src = path.resolve(app.kconfig.dataPath, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  src = path.resolve(app.kconfig.baseDir, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  return false;
};

module.exports = App;
