'use strict';

/**
 * Module for registering apps that can be createed
 * @module kbox.create
 */

var prompt = require('prompt');
var _ = require('lodash');
var fs = require('fs-extra');
var path = require('path');
var deps = require('./core/deps.js');
var util = require('./util.js');
var chalk = require('chalk');

module.exports = function() {
  var apps = {};

  var appDefaults = {
    name : null,
    task: {
      name: null,
      module: null,
      description: null
    },
    options: []
  };

  var optionDefaults = {
    name: null,
    task: null,
    weight: 0,
    properties: null,
    conf: {
      type: null,
      key: null,
      plugin: null
    }
  };

  var add = function(appName, data) {
    if (!apps[appName]) {
      create(appName);
    }
    if (data.task) {
      apps[appName].task = data.task;
    }
    if (data.option) {
      apps[appName].options.push(_.merge({}, optionDefaults, data.option));
    }
  };

  var create = function(appName) {
    apps[appName] = appDefaults;
    apps[appName].name = appName;
  };

  var remove = function(appName) {
    if (apps[appName]) {
      delete apps[appName];
    }
  };

  var get = function(appName) {
    if (appName) {
      var options = _.sortBy(apps[appName].options, 'weight');
      apps[appName].options = options;
      return apps[appName];
    }
    return false;
  };

  var getAll = function() {
    return apps;
  };

  var buildTask = function(task, appName) {
    if (!get(appName)) {
      // todo: something useful besides silentfail
      console.log('F!');
    }
    else {
      var app = get(appName);
      task.path = ['create', appName];
      task.description = app.task.description;
      var props = {};
      app.options.forEach(function(opt) {
        if (opt.properties) {
          props[opt.name] = opt.properties;
        }
        if (opt.task) {
          task.options.push(opt.task);
        }
      });
      task.func = function(done) {
        prompt.override = this.options;
        prompt.start();
        prompt.get({
          properties: props
        },
        function(err, result) {
          if (err) {
            done(err);
          }
          else {
            createApp(app, result, done);
          }
        });
      };
    }
  };

  var createApp = function(app, result, callback) {
    var srcRoot = deps.lookup('config').srcRoot;
    var appsRoot = deps.lookup('config').appsRoot;
    var source = path.join(srcRoot, 'node_modules', app.task.module, 'app');
    var dest = path.join(appsRoot, result.name);
    console.log(chalk.yellow('Building your app...'));
    fs.copy(source, dest, function(err) {
      if (err) {
        throw err;
      }
      else {
        buildKboxJson(app, result, callback);
      }
    });
  };

  var buildKboxJson = function(app, result, callback) {
    var sourcePath = path.join(
      deps.lookup('config').srcRoot,
      'node_modules',
      app.task.module,
      'app'
    );
    // Load source files
    var sourceKbFile = path.join(sourcePath, 'kalabox.json');
    var sourcePkgFile = path.join(sourcePath, 'package.json');
    var kalaboxJson = require(sourceKbFile);
    var pkgJson = require(sourcePkgFile);

    // Customize kb.json
    app.options.forEach(function(opt) {
      if (opt.conf) {
        if (opt.conf.type === 'global') {
          kalaboxJson[opt.conf.key] = result[opt.name];
        }
        else if (opt.conf.type === 'plugin') {
          var plugin = opt.conf.plugin;
          var key = opt.conf.key;
          kalaboxJson.pluginConf[plugin][key] = result[opt.name];
        }
      }
    });

    // Customize pkg.json
    pkgJson.name = result.name;

    // Update filezzz
    var appPath = path.join(deps.lookup('config').appsRoot, result.name);
    var destKbFile = path.join(appPath, 'kalabox.json');
    var destPkgFile = path.join(appPath, 'package.json');
    fs.writeFileSync(destKbFile, JSON.stringify(kalaboxJson, null, 2));
    fs.writeFileSync(destPkgFile, JSON.stringify(pkgJson, null, 2));

    // Install node deps
    util.npm.installPackages(appPath, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log(chalk.green('I see you have constructed a new kbox app!'));
        callback();
      }
    });
  };

  return {
    add: add,
    get: get,
    getAll: getAll,
    buildTask: buildTask
  };

};
