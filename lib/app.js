'use strict';

var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');
var util = require('util');
var _util = require('./util.js');

var _ = require('lodash');

var cmp = require('./component.js');
var deps = require('./deps.js');
var _plugin = require('./plugin.js');
var kConfig = require('./kConfig.js');

/**
 * Loads an individual plugin into the app manager.
 */
/*var loadPlugin = function(plugin, key, app, context) {
  plugin.key = key;
  var pluginPath = 'plugins/' + key;
  if (plugin.path) {
    pluginPath = plugin.path + '/' + key;
  }
  var src = loadPath(app, pluginPath);
  if (src !== false) {
    app.manager.plugins[key] = _plugin.init(plugin, require(src));
  }
};*/

/**
 * Validates appName against regular expression.
 */
var verifyAppNameIsValid = function(appName) {
  if (!_util.longname.isValid(appName)) {
    var regex = _util.longname.getValidateRegex();
    var msg = util.format('App name "%s" must match regular expression "%s".',
      appName,
      regex
    );
    throw new Error(msg);
  }
};

/**
 * Loads static config + dynamic elements into the app object.
 */
/*var loadConfig = function(app) {
  app.tasks = {};

  // TODO: Validate config location
  app.profilePath = path.resolve(app.path, '.kalabox');
  if (!fs.existsSync(app.profilePath)) {
    throw new Error('File does not exist: ' + app.profilePath);
  }
  var configFile = path.resolve(app.profilePath, 'profile.json');
  if (!fs.existsSync(configFile)) {
    throw new Error('File does not exist: ' + configFile);
  }
  // Load config
  app.config = require(configFile);

  // Validate name
  if (!app.config.name) {
    throw new Error('App config must define a name.');
  }
  verifyAppNameIsValid(app.config.name);
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
};*/

var App = function(name, config)   {
  var self = this;
  var _this = self;

  self.config = config;
  self.name = name;
  self.appDomain = [self.name, config.domain].join('.');
  self.url = 'http://' + self.appDomain;

  // Setup event emitter & public handler
  EventEmitter.call(this);
  this.event = function(key, obj) {
    _this.emit(key, obj);
  };
};
util.inherits(App, EventEmitter);

App.prototype.setupComponents = function() {
  var self = this;
  self.components = {};
  for (var key in this.config.appComponents) {
    var component = this.config.appComponents[key];
    self.components[key] = new cmp.Component(self, key, component);
  }
};

App.prototype.loadPlugins = function() {
  var self = this;
  if (self.config.appPlugins !== undefined) {
    self.plugins = self.config.appPlugins;
  } else {
    self.plugins = [];
  }
  var pluginDirs = [
    self.config.appRoot,
    self.config.srcRoot,
    self.config.kalaboxRoot
  ];
  var overrides = {
    app: self,
    appConfig: self.config
  };
  deps.override(overrides, function(done) {
    self.plugins.forEach(function(pluginName) {
      var plugin = _plugin.load(pluginName, pluginDirs);
      if (plugin !== null) {
        self.plugins[pluginName] = plugin;
      }
    });
    self.config.globalPlugins.forEach(function(pluginName) {
      var plugin = _plugin.loadIfUsesApp(pluginName, pluginDirs);
      if (plugin !== null) {
        self.plugins[pluginName] = plugin;
      }
    });
    done();
  });
};

App.prototype.setup = function() {
  this.setupComponents();
  this.loadPlugins();
};

module.exports = App;
