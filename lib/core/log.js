'use strict';

var winston = require('winston');
var deps = require('./deps.js');
var fs = require('fs');
var path = require('path');

var logger = null;

var init = exports.init = function() {
  deps.call(function(globalConfig) {
    var logRoot = globalConfig.logRoot;
    if (!fs.existsSync(logRoot)) {
      fs.mkdirSync(logRoot);
    }
    logger = new (winston.Logger)({
      transports: [
        new (winston.transports.Console)(),
        new (winston.transports.DailyRotateFile)({
          filename: path.join(logRoot, 'kalabox.log'),
          level: 'debug'
        })
      ]
    });
  });
};

var instance = function() {
  if (!logger) {
    init();
  }
  return logger;
};

var debug = exports.debug = function() {
  var args = Array.prototype.slice.call(arguments);
  instance().debug.apply(this, args);
};

var info = exports.info = function() {
  var args = Array.prototype.slice.call(arguments);
  instance().info.apply(this, args);
};
