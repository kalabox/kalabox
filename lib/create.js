/**
 * Module for registering apps that can be createed
 * @module kbox.create
 */

'use strict';

module.exports = function() {
  var createAppList = {};

  var appDefaults = {
    name : null,
    task: {
      name: 'Drupal 7',
      module: 'kalabox-app-drupal7',
      description: 'Creates a Drupal 7 app.'
    },
    options: []
  }

  var optionDefaults = {
    name: null,
    alias: null,
    kind: null,
    weight: 0,
    description: null,
    properties: null
  }

  var createTask = function(appName, data) {
    if (!createAppList[appName]) {
      createAppList[appName] = {
        task: data,
        opts: []
      };
    }
  };

  var createTaskOption = function(appName, data) {
    if (createAppList[appName]) {
      createAppList[appName].opts.push(data);
    }
  };

  var remove = function(appName) {
    if (createAppList[appName]) {
      delete createAppList[appName];
    }
  };

  var getCreateTask = function(appName) {
    if (appName) {
      return createAppList[appName];
    }
    return createAppList;
  };

  return {
    createTask: createTask,
    createTaskOption: createTaskOption,
    getCreateTask: getCreateTask
  };

};
