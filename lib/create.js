/**
 * Module for registering apps that can be createed
 * @module kbox.create
 */

'use strict';

var appModels = function singleton() {
  var modelList = {};

  this.add = function(appName, data) {
    if (!modelList[appName]) {
      modelList[appName] = data;
    }
  };

  this.remove = function(appName) {
    if (modelList[appName]) {
      delete modelList[appName];
    }
  };

  this.getModels = function() {
    return modelList;
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
