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
var init = function(plugin, cb) {
  deps.override({plugin:plugin}, function(done) {
    deps.call(cb);
    done();
  });
};
module.exports.init = init;

module.exports.load = function(pluginName, dirsToSearch) {
  dirsToSearch = dirsToSearch.map(function(dir) {
    return _path.join(dir, PLUGIN_DIRNAME, pluginName, PLUGIN_FILENAME);
  });
  var path = _util.searchForPath(dirsToSearch);
  if (path === null) {
    return null;
  } else {
    return init(pluginName, require(path));
  }
};
