'use strict';

var winston = require('winston');
var deps = require('./deps.js');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var _ = require('lodash');
var assert = require('assert');

var logger = null;

var init = exports.init = function(options) {
  if (!options) {
    options = {
      consoleOnly: false
    };
  }
  deps.call(function(globalConfig) {
    var logRoot = globalConfig.logRoot;
    if (!options.consoleOnly && !fs.existsSync(logRoot)) {
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
    // Log globalConfig
    logger.debug('globalConfig', globalConfig);
  });
};

var instance = function() {
  if (!logger) {
    init();
  }
  return logger;
};

/*
 * Proxy function to get around problem of winston throwing errs, rather
 * than just logging them.
 */
var proxy = function(name, args) {
  if (args.length === 0 || args.length > 2) {
    throw new TypeError('Invalid number of arguments: ' + args);
  }

  args = _.map(args, function(arg) {
    if (arg instanceof Error) {
      return arg.message;
    } else {
      return arg;
    }
  });
  instance()[name].apply(this, args);
};

var debug = exports.debug = function() {
  var args = Array.prototype.slice.call(arguments);
  proxy('debug', args);
};

var info = exports.info = function() {
  var args = Array.prototype.slice.call(arguments);
  proxy('info', args);
};

var error = exports.error = function(err, callback) {
  instance().log('error', err.message, err.stack, callback);
};
