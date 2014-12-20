/** Helper module for writing plugins
 * @module plugin
 */

'use strict';

// Constants
var PLUGIN_FILENAME = 'index.js';
var PLUGIN_DIRNAME = 'plugins';

var deps = require('./deps.js');
var fs = require('fs');
var _path = require('path');
var _util = require('./util.js');

/**
 * Calls callback with auto populated dependencies.
 * @arg {object} plugin - plugin object.
 * @arg {function} cb - callback function.
 * @example
 * var plugin = require(...);
 * module.exports = plugin.init(function(app, config, docker) {
 *   // Add plugin code here.
 * });
 * @example
 * var plugin = require(...);
 * module.exports = plugin.init(function(logger, app) {
 *   // Add plugin code here.
 * });
 */
var init = function(plugin, overrides, cb) {
  deps.override(overrides, function(done) {
    deps.call(cb);
    done();
  });
};
module.exports.init = init;

var loadRawPlugin = function(pluginName, pluginDirs) {
  pluginDirs = pluginDirs.map(function(dir) {
    return _path.join(dir, PLUGIN_DIRNAME, pluginName, PLUGIN_FILENAME);
  });
  var path = _util.searchForPath(pluginDirs);
  if (path === null) {
    return null;
  } else {
    return require(path);
  }
  
};

var pluginUsesApp = function(rawPlugin) {
  var depNames = deps.inspect(rawPlugin);
  var result = _util.helpers.find(depNames, function(depName) {
    return depName === 'app';
  });
  return (result !== null);
};

module.exports.loadIfUsesApp = function(pluginName, pluginDirs) {
  var rawPlugin = loadRawPlugin(pluginName, pluginDirs);
  if (rawPlugin === null) {
    return null;
  } else {
    var usesApp = pluginUsesApp(rawPlugin);
    if (usesApp) {
      return deps.call(function(app, appConfig) {
        var overrides = { 
          app: app,
          appConfig: appConfig,
          plugin: pluginName 
        };
        return init(pluginName, overrides, rawPlugin);
      });
    } else {
      return null;
    }
  }
};

module.exports.loadIfDoesNotUseApp = function(pluginName, pluginDirs) {
  var rawPlugin = loadRawPlugin(pluginName, pluginDirs);
  if (rawPlugin === null) {
    return null;
  } else {
    var usesApp = pluginUsesApp(rawPlugin);
    if (!usesApp) {
      var overrides = {
        plugin: pluginName
      };
      return init(pluginName, overrides, rawPlugin);
    } else {
      return null;
    }
  }
};

module.exports.load = function(pluginName, pluginDirs) {
  var rawPlugin = loadRawPlugin(pluginName, pluginDirs);
  if (rawPlugin === null) {
    var overrides = { 
      plugin: pluingName
    };
    return init(pluginName, overrides, rawPlugin);
  } else {
    return null;
  }
};
