'use strict';

// Node modules.
var util = require('util');
var path = require('path');

// NPM modules.
var _ = require('lodash');
var winston = require('winston');
var fs = require('fs-extra');

// Kalabox modules.
var AsyncEvents = require('./asyncEvents.js');
var kbox = require('../kbox.js');
var Promise = kbox.Promise;

/*
 * Lazy load logger api.
 */
var logger = _.once(function() {

  // Run inside a promise.
  return Promise.try(function() {
    // Get config info from global config.
    var globalConfig = kbox.core.deps.get('globalConfig');
    var logRoot = globalConfig.logRoot;
    var logFilepath = path.join(logRoot, 'kalabox.log');
    // Make sure log directory exists.
    return Promise.fromNode(function(cb) {
      fs.mkdirp(logRoot, cb);
    })
    // Wrap errors.
    .wrap('Error creating log directory: %s', logRoot)
    // Create and return new logger api.
    .then(function() {
      // Gte log level for the console.
      var logLevelConsole = globalConfig.logLevelConsole || 'status';
      var argv = kbox.tasks.partitionArgv(process.argv.slice(2));
      if (argv.options.debug) {
        logLevelConsole = 'debug';
      } else if (argv.options.verbose) {
        logLevelConsole = 'info';
      }
      // Create logger.
      return new winston.Logger({
        transports: [
          new winston.transports.Console({
            level: logLevelConsole
          }),
          new winston.transports.File({
            filename: logFilepath,
            level: globalConfig.logLevel || 'info'
          })
        ]
      });
    });
  })
  // Wrap errors.
  .wrap('Error creating logger.');

});

/*
 * List of loggin types.
 */
var actions = {
  error: 'error',
  warn: 'warn',
  status: 'info',
  debug: 'debug',
  info: 'info'
};

/*
 * Just the name of the actions.
 */
var actionNames = _.keys(actions);

/*
 * Constructor.
 */
function Log(opts) {
  if (this instanceof Log) {
    this.opts = opts;
    AsyncEvents.call(this);
    /*
     * Add a prototype method to Log class for each action.
     */
    var self = this;
    _.each(actionNames, function(name) {
      Log.prototype[name] = function() {
        var args = _.toArray(arguments);
        args.unshift(name);
        return self.__log.apply(self, args);
      };
    });
  } else {
    return new Log(opts);
  }
}

/*
 * Inherit from async events class.
 */
util.inherits(Log, AsyncEvents);

/*
 * Base logging function.
 */
Log.prototype.__log = function() {

  // Setup.
  var self = this;
  var args = _.toArray(arguments);
  // Remove first argument, it's the kind of message.
  var kind = args.shift();
  // Format message.
  var msg = util.format.apply(null, args);

  // Write message to logging api and return a promise that resolves when
  // the logging is complete.
  var logToWinstonThread = Promise.fromNode(function(cb) {
    // Clone array.
    var winstonArgs = args.slice();
    // Add callback to end of args.
    winstonArgs.push(cb);
    // Log message with logging api.
    logger().then(function(logger) {
      var method = actions[kind];
      logger[method].apply(logger, winstonArgs);
    });
  });

  // Emit async events and return a promise that resolves when the events
  // are done being handled.
  // Emit both a specific <name> event and after that a generic message event.
  var emitEventsThread = self.emit(kind, msg)
    .then(function() {
      return self.emit('message', kind, msg);
    });

  // Return a promise the resolves when all logging threads are complete.
  return Promise.all([
    logToWinstonThread,
    emitEventsThread
  ])
  // Run each plugin in series.
  .tap(function() {
    if (self.plugins && self.plugins.length) {
      var opts = {
        concurrency: 1
      };
      return Promise.map(self.plugins, function(plugin) {
        return plugin.apply(null, [kind, msg]);
      }, opts);
    }
  });

};

/*
 * Returns a specialized logging api that adds a prefix in front of all
 * messages etc....
 * Further options can be added at a later time like coloring etc...
 */
Log.prototype.make = function(opts) {
  // A shortcut when you just want a prefix.
  if (typeof opts === 'string') {
    opts = {prefix: opts};
  }
  // Default options.
  opts = opts || {};
  // Create api object with a reference to this log class.
  var api = {
    log: this
  };
  // Add a method to api for each action.
  _.each(actionNames, function(name) {
    api[name] = function() {
      var args = _.toArray(arguments);
      // Add prefix to start of message being logged.
      if (opts.prefix && typeof args[0] === 'string') {
        args[0] = [opts.prefix, args[0]].join(' ==> ');
      }
      // Call logging api method.
      return api.log[name].apply(api.log, args);
    };
  });
  // Return api.
  return api;
};

/*
 * Register a plugin.
 */
Log.prototype.use = function(plugin) {
  this.plugins = this.plugins || [];
  this.plugins.push(plugin);
};

/*
 * Export constructor.
 */
module.exports = Log;
