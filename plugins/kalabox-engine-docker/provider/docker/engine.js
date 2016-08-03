'use strict';

/**
 * Module to wrap and abstract access to docker engine.
 * @module docker
 */

module.exports = function(kbox) {

  // NODE modules
  var format = require('util').format;

  // NPM modules
  var VError = require('verror');
  var _ = require('lodash');

  // Kalabox modules
  var Promise = kbox.Promise;
  var bin = require('./lib/bin.js')(kbox);
  var env = require('./lib/env.js')(kbox);

  // Get our docker engine executable
  var DOCKER_EXECUTABLE = bin.getDockerExecutable();

  // Set of logging functions.
  var log = kbox.core.log.make('KALABOX ENGINE');

  /*
   * Run a services command in a shell.
   */
  var serviceCmd = function(cmd, opts) {

    // Set the machine env
    env.setDockerEnv();

    // Retry
    return Promise.retry(function() {

      // Build and log the command
      var run = ['sudo', 'service', 'kalabox'].concat(cmd);
      log.info(format('Running %j', cmd));

      // Run the command
      return bin.sh(run, opts)

      // Throw an error
      .catch(function(err) {
        throw new VError(err);
      });

    });

  };

  /*
   * Bring engine up.
   */
  var up = function() {

    // Get status
    return isDown()

    // Only start if we aren't already
    .then(function(isDown) {
      if (isDown) {
        return serviceCmd(['start'], {mode: 'collect'});
      }
    })

    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error bringing daemon up.');
    });

  };

  /*
   * Bring engine down.
   */
  var down = function() {

    // Get provider status.
    return isUp()

    // Shut provider down if its status is running.
    .then(function(isUp) {
      if (isUp) {
        // Retry to shutdown if an error occurs.
        return serviceCmd(['stop'], {mode: 'collect'});
      }
    })

    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error while shutting down.');
    });

  };

  /*
   * Return engine's IP address.
   */
  var getIp = function() {
    return Promise.resolve('10.13.37.100');
  };

  /*
   * Return true if engine is up.
   */
  var isUp = function() {

    // Get status.
    return serviceCmd(['status'], {silent:true})
    // Do some lodash fu to get the status
    .then(function(result) {
      log.debug('Current status', result);
      return _.includes(result, 'start/running');
    });

  };

  /*
   * Return true if engine is down.
   */
  var isDown = function() {

    // Return the opposite of isUp.
    return isUp()
    .then(function(isUp) {
      return !isUp;
    });

  };

  /*
   * Return true if engine is installed.
   */
  var isInstalled = function() {

    // set the docker env
    env.setDockerEnv();

    // We have the engine executable now return whether we have the
    // vm or not
    if (kbox.util.shell.which(DOCKER_EXECUTABLE) === DOCKER_EXECUTABLE) {
      return Promise.resolve(true);
    }

    // We are not installed
    return Promise.resolve(false);

  };

  /*
   * Return cached instance of engine config.
   */
  var getEngineConfig = function() {

    return Promise.resolve({
      host: '10.13.37.100',
      port: '2375'
    });

  };

  /*
   * @todo: @pirog - I'm not touching this one! :)
   */
  var path2Bind4U = function(path) {
    return path;
  };

  // Build module function.
  return {
    down: down,
    engineConfig: getEngineConfig,
    getIp: getIp,
    isDown: isDown,
    isInstalled: isInstalled,
    isUp: isUp,
    name: 'docker',
    path2Bind4U: path2Bind4U,
    up: up
  };

};
