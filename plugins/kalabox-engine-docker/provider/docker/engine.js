'use strict';

/**
 * Module to wrap and abstract access to docker engine.
 * @module docker
 */

module.exports = function(kbox) {

  // NODE modules
  var format = require('util').format;
  var path = require('path');

  // NPM modules
  var fs = require('fs-extra');
  var VError = require('verror');

  // Kalabox modules
  var Promise = kbox.Promise;
  var bin = require('./lib/bin.js')(kbox);
  var env = require('./lib/env.js')(kbox);

  // Get our docker engine executable
  var DOCKER_EXECUTABLE = bin.getDockerExecutable();

  // Set of logging functions.
  var log = kbox.core.log.make('KALABOX ENGINE');
  var mode = kbox.core.deps.get('mode');

  /*
   * Get directory for docker engine.
   */
  var getEngineUpFiles = function() {

    // Get sysconfroot
    var sysConfRoot = kbox.core.deps.get('config').sysConfRoot;

    // Retrun files we need to check for
    return [
      path.join(sysConfRoot, 'docker.pid'),
      path.join(sysConfRoot, 'docker.socket')
    ];

  };

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
   * Bring engine up. Only do this in the CLI we assume the engine is on
   * on the GUI until we figure out how to deal with SUDO in GUI
   */
  var up = function() {

    // Automatically return true if we are in the GUI
    if (mode === 'gui' || process.platform === 'darwin') {
      return Promise.resolve(true);
    }

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

    // Automatically return true if we are in the GUI
    if (mode === 'gui' || process.platform === 'darwin') {
      return Promise.resolve(true);
    }

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
    // Return exec based on path
    switch (process.platform) {
      case 'darwin': return Promise.resolve('127.0.0.1');
      case 'linux': return Promise.resolve('10.13.37.100');
    }
  };

  /*
   * Return true if engine is up.
   */
  var isUp = function() {

    // Automatically return true if we are in the GUI
    if (mode === 'gui' || process.platform === 'darwin') {
      return Promise.resolve(true);
    }

    // Reduce list of engine files to a boolean
    return Promise.reduce(getEngineUpFiles(), function(isUp, file) {
      var fileExists = fs.existsSync(file);
      log.debug(format('File %s exists: %s', file, fileExists));
      log.debug(format('Engine status: %s', isUp && fileExists));
      return isUp && fileExists;
    }, true);

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

    var linuxConfig = {
      host: '10.13.37.100',
      port: '2375'
    };
    var darwinConfig = {
      host: '127.0.0.1',
      socketPath: '/var/run/docker.sock'
    };

    switch (process.platform) {
      case 'darwin': return Promise.resolve(darwinConfig);
      case 'linux': return Promise.resolve(linuxConfig);
    }

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
