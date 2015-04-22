'use strict';

/**
 * Module for registering apps that can be createed
 * @module kbox.create
 */

var prompt = require('prompt');
var _ = require('lodash');

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
      // fail
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
            createApp(result, done);
          }
        });
      };
    }
  };

  var createApp = function(result, done) {
    done();
  };

  return {
    add: add,
    get: get,
    getAll: getAll,
    buildTask: buildTask
  };

};

/*
  var createApp = function(opts, callback) {
    var source = path.resolve(__dirname, '..', 'kalabox-app-drupal7');
    var dest = path.join(deps.lookup('config').appsRoot, opts.name);
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
*/
