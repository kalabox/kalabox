'use strict';

var kbox = require('./kbox.js');
var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var Client = require('kalabox-metrics-rest').Client;

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
  return new Client(id, url);

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
  var idFilepath = path.join(config.sysConfRoot, INSTANCE_ID_FILENAME);

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
      // Get client.
      return Promise.try(getClient)
      // Get new ID from REST API.
      .then(function(client) {
        return client.__getId();
      })
      // Write new ID to ID file.
      .tap(function(id) {
        return Promise.fromNode(function(cb) {
          fs.writeFile(idFilepath, id, cb);
        });
      });
    }
  });

};

/*
 * Report meta data for metrics.
 */
var reportInternal = function(data) {

  if (isOn()) {

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

  } else {

    // Reporting is turned off.
    return Promise.resolve();

  }

};

/*
 * Report meta data for metrics.
 */
var report = function(data) {

  // Add to meta data.
  return Promise.try(function() {
    // Get config.
    var config = kbox.core.deps.get('config');
    // Add operation system information.
    data.os = config.os;
    // Add kalabox version information.
    data.version = config.version;
    // Add node version information.
    data.nodeVersion = process.version;
  })
  .then(function() {
    return reportInternal(data);
  })
  // Log metrics to debug log for transparency.
  .tap(function() {
    log.debug('Reporting.', data);
  })
  .timeout(10 * 1000)
  .catch(function(err) {
    kbox.core.log.info('METRICS ERROR: ' + err.message);
  });

};

/*
 * Short cut for reporting actions.
 */
var reportAction = function(action) {

  return report({action: action});

};

/*
 * Short cut for reporting errors.
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
