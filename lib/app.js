'use strict';

var fs = require('fs');
var path = require('path');
var core = require('./core.js');
var engine = require('./engine.js');
var helpers = require('./util.js').helpers;

var list = function(callback) {
  core.deps.call(function(globalConfig) {
    var root = globalConfig.appsRoot;
    if (fs.existsSync(root)) {
      fs.readdir(root, function(err, filenames) {
        if (err) {
          callback(err);
        } else {
          var results = helpers.filterMap2(filenames, function(filename) {
            var filepath = path.join(root, filename, core.config.CONFIG_FILENAME);
            if (fs.existsSync(filepath)) {
              return {name: filename};
            } else {
              return null;
            }
          });
          callback(err, results);
        }
      });
    } else {
      // The root directory does not exist.
      callback(null, []);
    }

  });
};
exports.list = list;

var get = function(appName, callback) {
  list(function(err, apps) {
    if (err) {
      callback(err);
    } else {
      var app = helpers.find(apps, function(app) { return app.name === appName; });
      if (app === null) {
        callback(new Error('App [' + appName + '] does not exist.'));
      } else {
        callback(null, app);
      }
    }
  });
};
exports.get = get;

var containers = function(app, callback) {
  engine.list(app.name, function(err, containers) {
    callback(err, containers);
  });
};
exports.containers = containers;

exports.stop = function(app, callback) {
  containers(app, function(err, containers) {
    if (err) {
      callback(err);
    } else {
      helpers.mapAsync(containers,
        function(container, callback) {
          engine.stop(container.id, callback);
        },
        function(errs) {
          callback(errs);
        });
    }
  });
};
