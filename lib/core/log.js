'use strict';

var winston = require('winston');
var deps = require('./deps.js');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var _ = require('lodash');
var assert = require('assert');

/*
 * Singleton dictionary for storing loggers.
 */
var loggers = {};

/*
 * Returns true if logger already exists, otherwise false.
 */
var containsLogger = function(name) {

  // Validate.
  if (!_.isString(name)) {
    throw new TypeError('Invalid logger name: ' + name);
  }

  return _.has(loggers, name);

};

/*
 * Get logger by logger name.
 */
var getLogger = function(name) {

  // Validate.
  if (!_.isString(name)) {
    throw new TypeError('Invalid logger name: ' + name);
  }

  if (containsLogger(name)) {

    // Logger found.
    return loggers[name];

  } else {

    // Return null.
    return null;

  }
};

/*
 * Create a logger with name and options, then store in singleton dictionary.
 */
var createLogger = function(name, opts) {

  // Validate.
  if (!_.isString(name)) {
    throw new TypeError('Invalid logger name: ' + name);
  }
  if (!_.isObject(opts)) {
    throw new TypeError('Invalid logger options: ' + opts);
  }

  if (containsLogger(name)) {

    // Logger already exists, so throw an error.
    throw new Error('Logger already exists with name: ' + name);

  } else {

    // Create and store new logger.
    var logger = new (winston.Logger)(opts);
    loggers[name] = logger;

    // Return created logger.
    return logger;

  }

};

/*
 * Init singleton instances of loggers.
 */
var init = exports.init = function(options) {

  // Options is an optional argument.
  if (!options) {
    options = {};
  }

  // Set default options.
  if (!_.has(options, 'consoleOnly')) {
    options.consoleOnly = false;
  }

  // Validate options.
  var validOptions = ['consoleOnly'];
  _.each(Object.keys(options), function(key) {
    if (!_.contains(validOptions, key)) {
      throw new TypeError('Invalid logger init option: ' + key);
    }
  });

  // Grab kbox dependencies.
  deps.call(function(globalConfig, verbose) {

    // Grab location of log directory.
    var logRoot = globalConfig.logRoot;

    // Create log directory.
    if (!options.consoleOnly && !fs.existsSync(logRoot)) {
      mkdirp.sync(logRoot);
    }

    // Check verbose level to set console log level.
    var logLevelConsole = verbose ? 'debug' : globalConfig.logLevelConsole;

    // Setup main logger options.
    var mainTransports = [
      new winston.transports.Console({level: logLevelConsole})
    ];

    if (!options.consoleOnly) {
      // Add daily rotate file.
      mainTransports.push(new (winston.transports.DailyRotateFile)({
        filename: path.join(logRoot, 'main.log'),
        level: globalConfig.logLevel
      }));
    }

    // Create main logger.
    var mainLogger = createLogger('main', {
      transports: mainTransports,
      handleExceptions: false
    });

    // Create error logger.
    var errorLogger = createLogger('error', {
      transports: [
        new (winston.transports.DailyRotateFile)({
          filename: path.join(logRoot, 'error.log'),
          level: 'error'
        })
      ],
      handleExceptions: true,
      exitOnError: true
    });

  });

};

/*
 * Get instance of logger with given name.
 */
var instance = function(name) {

  // Make sure singleton has been init.
  if (!containsLogger(name)) {
    init();
  }

  // Get logger from dictionary.
  var logger = getLogger(name);
  if (!logger) {

    // Logger still not found, so throw an error.
    throw new Error('Logger not found: ' + name);

  } else {

    // All is good return logger.
    return logger;

  }

};

/*
 * List of valid log levels to be used.
 */
var validLogLevels = ['debug', 'info', 'error'];

/*
 * Proxy function to get around problem of winston throwing errs, rather
 * than just logging them.
 */
var proxy = function(name, level, args) {

  // Validate.
  if (args.length === 0) {
    throw new TypeError('Invalid number of arguments: ' + args);
  }
  if (!_.isString(name) || name.length === 0) {
    throw new TypeError('Invalid logger name: ' + name);
  }
  if (!_.contains(validLogLevels, level)) {
    throw new TypeError('Invalid log level: ' + level);
  }

  // Map any error to error.message.
  args = _.map(args, function(arg) {
    if (arg instanceof Error) {
      return arg.message;
    } else {
      return arg;
    }
  });

  // Apply arguments to correct function.
  instance(name)[level].apply(this, args);

};

/*
 * Log a debug level message.
 */
var debug = exports.debug = function() {
  var args = Array.prototype.slice.call(arguments);
  proxy('main', 'debug', args);
};

/*
 * Log a info level message.
 */
var info = exports.info = function() {
  var args = Array.prototype.slice.call(arguments);
  proxy('main', 'info', args);
};

/*
 * Log a error level message.
 */
var error = exports.error = function() {

  // Get raw arguments.
  var rawArgs = Array.prototype.slice.call(arguments);

  // Map error to a message and a stack.
  var args = [];
  _.each(rawArgs, function(arg) {
    if (arg instanceof Error) {
      args.push(arg.message);
      args.push(arg.stack);
    } else {
      args.push(arg);
    }
  });

  // Log.
  proxy('error', 'error', args);

};
