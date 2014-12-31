'use strict';

var fs = require('fs');
var path = require('path');
var core = require('./core.js');
var deps = core.deps;
var config = core.config;
var _util = require('./util.js');

var app = require('./apps/app.js');
exports.app = app;

var manager = require('./apps/manager.js');
exports.manager = manager;

var component = require('./apps/component.js');
exports.component = component;

exports.getAppNames = function(callback) {
  deps.call(function(globalConfig) {
    var root = globalConfig.appsRoot;
    if (fs.existsSync(root)) {
      fs.readdir(root, function(err, filenames) {
        if (err) {
          callback(err);
        } else {
          var filter = function(filename) {
            var filepath = path.join(root, filename, config.CONFIG_FILENAME);
            return fs.existsSync(filepath);
          };
          var results = _util.helpers.filter(filenames, filter);
          callback(err, results);
        }
      });
    } else {
      // The root directory does not exist.
      callback(null, []);
    }

  });
};
