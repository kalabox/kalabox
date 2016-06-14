'use strict';

/**
 * Module to wrap and abstract access to docker engine.
 * @module docker
 */

module.exports = function(kbox) {

  // Kalabox modules
  var Promise = kbox.Promise;
  var bin = require('./lib/bin.js')(kbox);
  var env = require('./lib/env.js')(kbox);

  // Get our docker engine executable
  var DOCKER_EXECUTABLE = bin.getDockerExecutable();

  /*
   * Bring engine up.
   */
  var up = function() {

    // Get status
    return Promise.resolve(true);

  };

  /*
   * Bring engine down.
   */
  var down = function() {

    // Get status
    return Promise.resolve(true);

  };

  /*
   * Return engine's IP address.
   */
  var getIp = function() {

    // Get status
    return Promise.resolve('10.13.37.100');

  };

  /*
   * Return true if engine is up.
   */
  var isUp = function() {

    // Get status
    return Promise.resolve(true);

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
