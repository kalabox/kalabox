var EventEmitter = require("events").EventEmitter;
var fs = require('fs');
var path = require('path');
var util = require("util");

var _ = require('lodash');
var vasync = require('vasync');

// Main app path & config setup
var manager = require('./appmanager.js');
var cmp = require('./component.js');
var container = require('./container.js');
var image = require('./image.js');

var baseDir = path.resolve(__dirname, '../');
var config = require('../config.json');

// Data path setup ~/.kalabox
var homePath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var dataPath = path.resolve(homePath, '.kalabox');
var appDataPath = path.resolve(dataPath, 'apps');

// Create ~/.kalabox/apps if it doesn't exist
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath);
}
if (!fs.existsSync(appDataPath)) {
  fs.mkdirSync(appDataPath);
}

// Instantiate docker object from config settings.
var Docker = require('dockerode');
var docker =  new Docker(config.docker);

var App = function(apppath) {
  // TODO: Validate path and .kalabox.json file
  this.docker = docker;
  this.manager = manager;
  EventEmitter.call(this);

  var _this = this;
  this.path = apppath;
  this.config = require(path.resolve(apppath, '.kalabox.json'));
  this.tasks = {};

  this.appname = this.config.name;
  this.appdomain = this.appname + '.' + config.domain;
  this.dataPath = path.resolve(appDataPath, this.appname);
  this.url = 'http://' + this.appdomain;

  this.prefix = this.config.name + '_';
  this.hasData = this.config.components.hasOwnProperty('data');
  this.dataCname = this.hasData ? 'kb_' + this.prefix + 'data' : null;

  // set/create ~/.kalabox/apps/<appname>
  this.kalaboxPath = path.resolve(appDataPath, this.appname);
  if (!fs.existsSync(this.kalaboxPath)) {
    fs.mkdirSync(this.kalaboxPath);
  }
  // set/create ~/.kalabox/apps/<appname>/cids
  this.cidPath = path.resolve(this.kalaboxPath, 'cids');
  if (!fs.existsSync(this.cidPath)) {
    fs.mkdirSync(this.cidPath);
  }

  // Set more properties for each component
  _this.components = {};
  _.map(_this.config.components, function(component, key) {
    _this.components[key] = new cmp.Component(_this, key, component);
  });

  // Load plugins
  _this.plugins = {};
  if (!_this.config.plugins) {
    _this.config.plugins = {};
  }
  var default_plugins = ['hipache', 'kalabox'];
  for (var x in default_plugins) {
    if (!_this.config.plugins[default_plugins[x]]) {
      _this.config.plugins[default_plugins[x]] = {};
    }
  }
  _.map(_this.config.plugins, function(plugin, key) {
    plugin.key = key;
    var pluginPath = 'plugins/' + key;
    if (plugin.path) {
      pluginPath = plugin.path + '/' + key;
    }
    var src = loadPath(_this, pluginPath);
    if (src !== false) {
      _this.plugins[key] = require(src)(plugin, _this);
    }
  });

  /**
   * Initialize the app by creating & starting the Docker containers.
   */
  this.init = function() {
    // TODO: Validate if <appname>_ containers exist already
    _this.emit('pre-init');
    var components = _.toArray(_.cloneDeep(_this.components));
    vasync.forEachPipeline({
      'func': cmp.create,
      'inputs': components
    }, function(err, results) {
      _this.emit('post-init');
    });
  };

  /**
   * Start all app containers.
   */
  this.start = function() {
    _this.emit('pre-start');
    var components = _.toArray(_.cloneDeep(_this.components));
    vasync.forEachPipeline({
      'func': cmp.start,
      'inputs': components
    }, function(err, results) {
      _this.emit('post-start');
    });
  };

  /**
   * Stop all app containers.
   */
  this.stop = function() {
    _this.emit('pre-stop');
    var components = _.toArray(_.cloneDeep(_this.components));
    vasync.forEachPipeline({
      'func': cmp.stop,
      'inputs': components
    }, function(err, results) {
      _this.emit('post-stop');
    });
  };

  /**
   * Kill all app containers.
   */
  this.kill = function() {
    _this.emit('pre-kill');
    var components = _.toArray(_.cloneDeep(_this.components));
    vasync.forEachPipeline({
      'func': cmp.kill,
      'inputs': components
    }, function(err, container) {
      _this.emit('post-kill');
    });
  };

  /**
   * Remove all app containers.
   */
  this.remove = function() {
    _this.emit('pre-remove');
    var components = _.toArray(_.cloneDeep(_this.components));
    vasync.forEachPipeline({
      'func': cmp.remove,
      'inputs': components
    }, function(err, results) {
      _this.emit('post-remove');
    });
  };

  /**
   * Pull all component images.
   */
  this.pull = function() {
    _this.emit('pre-pull');
    var components = _.filter(_this.components, function(component) { return !component.image.build });
    var images = _.pluck(components, 'image');
    vasync.forEachPipeline({
      'func': image.pull,
      'inputs': images
    }, function(err, results) {
      _this.emit('post-pull');
    });
  };

  /**
   * Build all component images.
   */
  this.build = function() {
    _this.emit('pre-build');
    var components = _.filter(_this.components, function(component) { return component.image.build === true});
    var images = _.pluck(components, 'image');

    vasync.forEachPipeline({
      'func': image.build,
      'inputs': images
    }, function(err, results) {
      _this.emit('post-build');
    });
  };

  this.event = function(key, obj) {
    _this.emit(key, obj);
  };
};

/**
 * Fetches a valid path based on a given relative path.
 * - First looks relative to the .kalabox.json file
 * - Second looks relative to the ~/.kalabox directory
 * - Third looks relative to the Kalabox source
 *
 * @param app
 * @param src
 * @return path or false if not found.
 */
var loadPath = function(app, relativePath) {
  var src = path.resolve(app.path, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  src = path.resolve(dataPath, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  src = path.resolve(baseDir, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  return false;
};

util.inherits(App, EventEmitter);
module.exports = App;
