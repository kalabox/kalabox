'use strict';

var core = require('../core.js');

var unimplementedMethod = function(name, funcName) {
  return function() {
    throw new Error('Provider interface method "' +
      funcName +
      '" for provider "' +
      name +
      '" has not been implemented!');
  };
};

var getProviderInterface = function(name) {
  var intf = {
    name: name
  };
  [
    'name',
    'up',
    'down',
    'isInstalled',
    'isUp',
    'isDown',
    'hasTasks',
    'engineConfig'
  ].forEach(function(x) {
    intf[x] = unimplementedMethod(name, x);
  });
  return intf;
};

var implementation = null;

var getInstance = function() {
  if (!implementation) {
    core.deps.call(function(providerModule) {
      var intf = getProviderInterface(providerModule.name);
      implementation = providerModule.init(intf);
    });
  }
  return implementation;
};

exports.getName = function() {
  return getInstance().name;
};

exports.up = function(callback) {
  getInstance().up(callback);
};

exports.down = function(callback) {
  getInstance().down(callback);
};

exports.isInstalled = function(callback) {
  getInstance().isInstalled(callback);
};

exports.isUp = function(callback) {
  getInstance().isUp(callback);
};

exports.isDown = function(callback) {
  getInstance().isDown(callback);
};

exports.hasTasks = function() {
  // @todo: this should return true only if the provider has been installed
  // and of course if the provider also has tasks to run
  getInstance().hasTasks;
};

exports.engineConfig = function(callback) {
  getInstance().engineConfig(callback);
};
