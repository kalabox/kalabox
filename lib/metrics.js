/**
 * Anonymous metrics reporting for Kalabox.
 *
 * @name metrics
 */

'use strict';

var kbox = require('./kbox.js');
var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var Client = require('kalabox-stats-client').Client;
var uuid = require('uuid');

/*
 * Instance ID filename.
 */
var INSTANCE_ID_FILENAME = '.instance.id';

/*
 * Logging functions.
 */
var log = kbox.core.log.make('METRICS');

/*
 * Get config from dependencies.
 */
var getConfig = function() {

  // Get config from dependencies.
  return kbox.core.deps.get('config');

};

/*
 * Get metrics portion of config.
 */
var getMetricsConfig = function() {

  // Return metrics config, or empty object.
  return getConfig().stats || {};

};

/*
 * Get a REST client instance.
 */
var getClient = function(id) {

  // Get URL of metrics REST API from metrics config.
  var url = getMetricsConfig().url;

  // Return new client.
  return new Client({
    id: id,
    url: url
  });

};

/*
 * Return true if metrics should be reported.
 */
var isOn = function() {

  // Get metrics config.
  var metricsConfig = getMetricsConfig();

  // Return value of report metrics from config.
  return metricsConfig.report || false;

};

/*
 * Get the metrics ID for this kalabox instance.
 */
var getId = function() {

  // Get config.
  var config = getConfig();

  // Build filepath to ID file.
  var idFilepath = path.join(config.userConfRoot, INSTANCE_ID_FILENAME);

  // Read ID file.
  return Promise.fromNode(function(cb) {
    fs.readFile(idFilepath, {encoding: 'utf8'}, cb);
  })
  // File does not exist.
  .catch(function(err) {
    if (err.code === 'ENOENT') {
      // IF file doesn't exist just return null.
      return null;
    }
    throw err;
  })
  // If ID file doesn't exist, get new ID from REST API and write ID file.
  .then(function(id) {
    if (id) {
      return id;
    } else {
      id = uuid.v4();
      // Write new ID to ID file.
      return Promise.fromNode(function(cb) {
        fs.writeFile(idFilepath, id, cb);
      })
      // Return id.
      .return(id);
    }
  });

};

/*
 * Report meta data for metrics.
 */
var reportInternal = function(data) {

  // Get ID.
  return getId()
  // Get client.
  .then(function(id) {
    return getClient(id);
  })
  // Report meta data.
  .then(function(client) {
    return client.report(data);
  });

};

/**
 * Report meta data for metrics.
 * @memberof metrics
 */
var report = function(data) {

  // Is reporting turned on?
  var shouldReport = isOn();

  if (shouldReport) {

    // List of functions for adding meta data to report.
    var fns = [
      // Add mode (gui|cli) information.
      function() {
        data.mode = kbox.core.deps.get('mode');
      },
      // Add information from config.
      function() {
        // Get config.
        var config = kbox.core.deps.get('config');
        // Add development mode information.
        // @todo: deprecate "devMode" in favor of "locked"
        data.devMode = config.devMode;
        // Add kalabox version information.
        data.version = config.version;
        // Add operation system information.
        data.os = config.os;
      },
      // Add node version information.
      function() {
        data.nodeVersion = process.version;
      }
    ];

    // Add to meta data.
    return Promise.each(fns, function(fn) {
      // Run meta data add function in context of a promise.
      return Promise.try(fn)
      // Ignore errors.
      .catch(function() {});
    })
    // Report to remote service.
    .then(function() {
      return reportInternal(data);
    })
    // Log metrics to debug log for transparency.
    .tap(function() {
      log.debug('Reporting.', data);
    })
    // Make sure an unresponsive service doesn't hang the application.
    .timeout(10 * 1000)
    // Wrap errors.
    .catch(function(err) {
      log.info('METRICS ERROR: ' + err.message);
    });

  } else {

    // Reporting is turned off.
    return Promise.resolve();

  }

};

/**
 * Short cut for reporting actions.
 * @memberof metrics
 */
var reportAction = function(action, opts) {

  // Metadata to report.
  var obj = {
    action: action
  };

  // Try to gather extra metadata from a possible app object.
  var config = _.get(opts, 'app.config');
  if (config) {
    var type = _.get(config, 'type');
    var email = _.get(config, 'pluginconfig[' + type + '].email');
    obj.email = email;
  }

  // Report.
  return report(obj);

};

/**
 * Document
 * @memberof metrics
 */
var reportError = function(err) {

  var data = {
    action: 'error',
    message: err.message,
    stack: kbox.getStackTrace(err),
    tags: kbox.errorTags.get(err)
  };

  return report(data);

};

/*
 * Build module object.
 */
module.exports = {
  report: report,
  reportAction: reportAction,
  reportError: reportError
};
