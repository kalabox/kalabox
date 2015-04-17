/**
 * Module for registering apps that can be createed
 * @module kbox.create
 */

'use strict';

var appModels = function singleton() {
  var createAppList = {};

  this.createTask = function(appName, data) {
    if (!createAppList[appName]) {
      createAppList[appName] = {
        task: data,
        opts: []
      };
    }
  };

  this.createTaskOption = function(appName, data) {
    if (createAppList[appName]) {
      createAppList[appName].opts.push(data);
    }
  };

  this.remove = function(appName) {
    if (createAppList[appName]) {
      delete createAppList[appName];
    }
  };

  this.getCreateTask = function(appName) {
    if (appName) {
      return createAppList[appName];
    }
    return createAppList;
  };

};

appModels.instance = null;

appModels.getInstance = function() {
  if (this.instance === null) {
    this.instance = new appModels();
  }
  return this.instance;
};

module.exports = appModels.getInstance();
