'use strict';

/**
 * Module for registering apps that can be createed
 * @module kbox.create
 */

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

  return {
    add: add,
    get: get,
    getAll: getAll
  };

};
