'use strict';

/**
 * Module for registering apps that can be createed
 * @module kbox.create
 */

var prompt = require('prompt');
var _ = require('lodash');
var fs = require('fs');
var ncp = require('ncp').ncp;
var path = require('path');
var deps = require('./core/deps.js');

module.exports = function() {
  var apps = {};

  var appDefaults = {
    name : null,
    task: {
      name: null,
      module: null,
      description: null
    },
    options: [],
    conf: {
      type: null,
      key: null,
      plugin: null
    }
  };

  var optionDefaults = {
    name: null,
    task: null,
    weight: 0,
    properties: null
  };

  var add = function(appName, data) {
    if (!apps[appName]) {
      create(appName);
    }
    if (data.task) {
      apps[appName].task = data.task;
    }
    if (data.option) {
      apps[appName].options.push(_.merge(optionDefaults, data.option));
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
      return apps[appName];
    }
    return false;
  };

  var getAll = function() {
    return apps;
  };

  var buildTask = function(task, appName) {
    if (!apps[appName]) {
      // todo: something useful besides silentfail
      console.log('F!');
    }
    else {
      var app = apps[appName];
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
    var source = path.join(srcRoot, 'node_modules', app.task.module);
    var dest = path.join(appsRoot, result.name);
    ncp(source, dest, function(err) {
      if (err) {
        callback(err);
      }
      else {
        console.log('done');
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
