'use strict';

// @todo eventually this needs to return the correct provider
exports = module.exports = require('./provider/b2d.js');

var unimplementedMethod = function(name) {
  return function() {
    throw new Error('Provider interface method "' + name + '" has not been implemented!');
  };
};

var getProviderInterface = function() {
  var um = unimplementedMethod;
  return {
    getName: um('getName'),
    up: um('up'),
    down: um('down'),
    isUp: um('isUp'),
    isDown: um('isDown')
  };
};

var myFakeProvider = {
  init: function() {
    var intf = getProviderInterface();
    intf.getName = function() { return 'myFakeProvider'; };
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
  var conditionWhereWeWouldUseFakeProvider = true;
  if (!implementation) {
    if (conditionWhereWeWouldUseFakeProvider) {
      implementation = myFakeProvider.init();
    } else {
      // use another provider
    }
  }
  return implementation;
};

exports.getName = function() {
  return getInstance().getName();
};

exports.up = function(callback) {
  getInstance().up(callback);
};

exports.down = function(callback) {
  getInstance().down(callback);
};

exports.isUp = function(callback) {
  getInstance().isUp(callback);
};

exports.isDown = function(callback) {
  getInstance().isDown(callback);
};
