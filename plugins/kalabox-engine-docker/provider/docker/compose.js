/**
 * Module to wrap and abstract access to docker compose.
 * @module compose
 */

'use strict';

module.exports = function(kbox) {

  // Native modules
  var path = require('path');
  var url = require('url');

  // NPM modules
  var _ = require('lodash');
  var fs = require('fs-extra');

  // Kalabox modules
  var bin = require('./lib/bin.js')(kbox);
  var env = require('./lib/env.js')(kbox);
  var machine = require('./machine.js')(kbox);
  var Promise = kbox.Promise;

  // Get some composer things
  var COMPOSE_EXECUTABLE = bin.getComposeExecutable();

  // Set of logging functions.
  var log = kbox.core.log.make('COMPOSE');

  // Set our project compose on app events
  kbox.core.events.on('pre-app-start', 1, function(app) {
    kbox.core.env.setEnv('COMPOSE_PROJECT_NAME', app.name);
  });
  kbox.core.events.on('pre-app-stop', 1, function(app) {
    kbox.core.env.setEnv('COMPOSE_PROJECT_NAME', app.name);
  });
  kbox.core.events.on('pre-app-uninstall', 1, function(app) {
    kbox.core.env.setEnv('COMPOSE_PROJECT_NAME', app.name);
  });

  /*
   * Run a provider command in a shell.
   */
  var shCompose = function(cmd, opts) {

    // Set the machine env
    env.setDockerEnv();

    // Get our config so we can set our env correctly
    return machine.engineConfig()

    // Set correct ENV for remote docker composing
    .then(function(config) {

      // Parse the docker host url
      var dockerHost = url.format({
        protocol: 'tcp',
        slashes: true,
        hostname: config.host,
        port: config.port
      });

      // Set our compose env
      kbox.core.env.setEnv('DOCKER_HOST', dockerHost);
      kbox.core.env.setEnv('DOCKER_TLS_VERIFY', 1);
      kbox.core.env.setEnv('DOCKER_MACHINE_NAME', config.machine);
      kbox.core.env.setEnv('DOCKER_CERT_PATH', config.certDir);

      // Run a provider command in a shell.
      return bin.sh([COMPOSE_EXECUTABLE].concat(cmd), opts);

    });

  };

  /*
   * Expand dirs/files to an array of kalabox-compose files options
   */
  var getFiles = function(compose) {

    // Only add files if they exist
    return _.map(compose, function(loc) {

      // If we dont have a yaml file then assume its a dir
      var yamls = ['.yaml', '.yml'];
      var isDir = !_.includes(yamls, path.extname(loc));
      var file = (isDir) ? path.join(loc, 'kalabox-compose.yml') : loc;

      // Only add yaml files that exist
      if (fs.existsSync(file)) {
        return ['--file', file].join(' ');
      }

    });
  };

  /*
   * Run docker compose pull
   */
  var pull = function(compose) {

    // Get our compose files and build the command
    var cmd = getFiles(compose);
    cmd.push('pull');

    // Log
    log.debug('Pulling images from ' + compose);

    // Run command
    return Promise.retry(function() {
      return shCompose(cmd);
    });

  };

  /*
   * Run docker compose stop
   */
  var stop = function(compose) {

    // Get our compose files and build the command
    var cmd = getFiles(compose);
    cmd.push('stop');

    // Log
    log.debug('Stopping images from ' + compose);

    // Run command
    return Promise.retry(function() {
      return shCompose(cmd);
    });

  };

  /*
   * You can do a create, rebuild and start with variants of this
   */
  var up = function(compose, opts) {

    // Default options
    var defaults = {
      background: true,
      recreate: false,
      stop: false
    };

    // Merge in defaults
    opts = _.merge(defaults, opts);

    // Get our compose files
    var files = getFiles(compose);

    // Log
    log.debug('Creating containers from ' + compose);

    // Run up command if we have compose files
    if (!_.isEmpty(files)) {
      return Promise.retry(function() {

        // Up options
        var options = [];

        // Run in background
        if (opts.background) {
          options.push('-d');
        }

        // Auto recreate
        if (opts.recreate) {
          options.push('--force-recreate');
        }
        else {
          options.push('--no-recreate');
        }

        // Up us
        return shCompose(files.concat(['up']).concat(options), opts);
      })

      // Then we want to stop the containers so this works the same as
      // docker.create
      .then(function() {
        if (opts.stop) {
          return stop(compose);
        }
      });
    }
  };

  /*
   * Run docker compose pull
   */
  var start = function(compose) {

    // Log
    log.debug('Starting images from ' + compose);

    // Specify correct options for starting via compose up
    var startOptions = {
      recreate: false,
      stop: false
    };

    // Run command
    return Promise.retry(function() {
      return up(compose, startOptions);
    });

  };

  /*
   * Run docker compose pull
   */
  var getId = function(files, service) {

    // Get our compose files and build the command
    var cmd = getFiles(files);
    cmd.push('ps -q');
    cmd.push(service);

    // Log
    log.debug('Trying to discover container id...');

    // Run command
    return Promise.retry(function() {
      return shCompose(cmd, {silent:true});
    });

  };

  /*
   * Run docker compose pull
   */
  var create = function(compose) {

    // Log
    log.debug('Starting images from ' + compose);

    // Specify correct options for starting via compose up
    var startOptions = {
      recreate: false,
      stop: true
    };

    // Run command
    return Promise.retry(function() {
      return up(compose, startOptions);
    });

  };

  // Build module function.
  return {
    getId: getId,
    pull: pull,
    create: create,
    start: start,
    stop: stop
  };

};
