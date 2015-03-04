'use strict';

var winston = require('winston');
var deps = require('./deps.js');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var logger = null;

var init = exports.init = function(options) {
  if (!options) {
    options = {
      consoleOnly: false
    };
  }
  deps.call(function(globalConfig) {
    var logRoot = globalConfig.logRoot;
    if (!fs.existsSync(logRoot)) {
      mkdirp.sync(logRoot);
    }
    var transportConsole = new (winston.transports.Console)({
      level: globalConfig.logLevelConsole
    });
    var transportFile = new (winston.transports.DailyRotateFile)({
      filename: path.join(logRoot, 'kalabox.log'),
      level: globalConfig.logLevel
    });
    var transports = options.consoleOnly ?
      [transportConsole] :
      [transportConsole, transportFile];
    logger = new (winston.Logger)({
      transports: transports
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

var error = exports.error = function(err, callback) {
  instance().log('error', err.message, err.stack, callback);
};
