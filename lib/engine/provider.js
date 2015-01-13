'use strict';

var b2dProvider = require('./provider/b2dProvider.js');

// @todo eventually this needs to return the correct provider
exports = module.exports = require('./provider/b2d.js');

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
  var um = unimplementedMethod;
  return {
    name: name,
    up: um(name, 'up'),
    down: um(name, 'down'),
    isInstalled: um(name, 'isInstalled'),
    isUp: um(name, 'isUp'),
    isDown: um(name, 'isDown')
  };
};

var myFakeProvider = {
  init: function() {
    var intf = getProviderInterface('myFakeProvider');
    intf.up = function(callback) {
      // implement me
      callback(null);
    };
    intf.down = function(callback) {
      // implement me
      callback(null);
    };
    intf.isUp = function(callback) {
      callback(null, true);
    };
    intf.isDown = function(callback) {
      intf.isUp(function(err, isUp) {
        callback(err, !isUp);
      });
    };
    return intf;
  }
};

var implementation = null;

var getInstance = function() {
  if (!implementation) {
    var intf = getProviderInterface(b2dProvider.name);
    implementation = b2dProvider.init(intf);
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
