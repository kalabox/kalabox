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
   * Get services wrapper
   */
  var getServicesWrapper = function(cmd) {

    // Return file(s) we need to check for
    switch (process.platform) {
      case 'darwin':
        return ['launchctl', cmd, 'com.docker.helper'];
      case 'linux':
        return ['sudo', 'service', 'kalabox'].concat(cmd);
      case 'win32':
        var base = process.env.ProgramW6432;
        var dockerBin = base + '\\Docker\\Docker\\Docker for Windows.exe';
        return [cmd, '/B', '""', dockerBin];
    }

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
      log.info(format('Running %j', cmd));

      // Run the command
      return bin.sh(getServicesWrapper(cmd), opts)

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

    // Automatically return true if we are in the GUI and on linux because
    // this requires SUDO and because the daemon should always be running on nix
    if (mode === 'gui' && process.platform === 'linux') {
      return Promise.resolve(true);
    }

    // Get status
    return isDown()

    // Only start if we aren't already
    .then(function(isDown) {
      if (isDown) {
        return serviceCmd(['start']);
      }
    })

    // Wait for the daemon to respond
    .retry(function() {
      log.debug('Trying to connect to daemon.');
      return bin.sh([DOCKER_EXECUTABLE, 'info'], {mode: 'collect'});
    }, {max: 25, backoff: 1000})

    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error bringing daemon up.');
    });

  };

  /*
   * Bring engine down.
   */
  var down = function() {

    // Automatically return true if we are in the GUI and on linux because
    // this requires SUDO and because the daemon should always be running on nix
    if (mode === 'gui' && process.platform === 'linux') {
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
   * Return true if engine is up.
   */
  var isUp = function() {

    // Whitelist this in windows for now
    return bin.sh([DOCKER_EXECUTABLE, 'info'], {mode: 'collect'})

    // Return true if we get a zero response
    .then(function() {
      log.debug('Engine is up.');
      return Promise.resolve(true);
    })

    // Return false if we get a non-zero response
    .catch(function() {
      log.debug('Engine is down.');
      return Promise.resolve(false);
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

    // Return whether we have the engine executable in the expected location
    var which = kbox.util.shell.which(DOCKER_EXECUTABLE);
    if (which.toUpperCase() === DOCKER_EXECUTABLE.toUpperCase()) {
      return Promise.resolve(true);
    }

    // We are not installed
    return Promise.resolve(false);

  };

  /*
   * Return cached instance of engine config.
   */
  var getEngineConfig = function() {

    // Return the correct config
    switch (process.platform) {
      case 'darwin':
        return Promise.resolve({
          host: '127.0.0.1',
          socketPath: '/var/run/docker.sock'
        });
      case 'linux':
        return Promise.resolve({
          host: '10.13.37.100',
          port: '2375'
        });
      case 'win32':
        return Promise.resolve({
          host: '127.0.0.1',
          port: '2375'
        });
    }

  };

  /*
   * Return engine's IP address.
   */
  var getIp = function() {
    return getEngineConfig().host;
  };

  /*
   * This should be the same on macOS and Linux, win needs a little extra
   * magic
   */
  var path2Bind4U = function(path) {
    var bind = path;
    if (process.platform === 'win32') {
      bind = path.replace(/\\/g, '/').replace('C:/', 'c:/');
    }
    return bind;
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
