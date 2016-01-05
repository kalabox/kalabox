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
   * Run docker compose stop
   */
  var stop = function(compose, opts) {

    // Get options
    var options = opts || {};

    // Get our compose files and build the command
    var cmd = getFiles(compose);

    // Add project if we have one
    if (options.project) {
      cmd.push('--project-name ' + options.project);
    }

    // Main command
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

    // Get opts
    var options = opts || {};

    // Merge in defaults
    options = _.merge(defaults, options);

    // Get our compose files
    var preFlags = getFiles(compose);

    // Add in a project if we have one
    if (options.project) {
      preFlags.push('--project-name ' + options.project);
    }

    // Log
    log.debug('Creating containers from ' + compose);

    // Run up command if we have compose files
    if (!_.isEmpty(getFiles(compose))) {
      return Promise.retry(function() {

        // Up options
        var flags = [];

        // Run in background
        if (options.background) {
          flags.push('-d');
        }

        // Auto recreate
        if (options.recreate) {
          flags.push('--force-recreate');
        }
        else {
          flags.push('--no-recreate');
        }

        // Up us
        return shCompose(preFlags.concat(['up']).concat(flags));
      })

      // Then we want to stop the containers so this works the same as
      // docker.create
      .then(function() {
        if (options.stop) {
          return stop(compose, options);
        }
      });
    }
  };

  /*
   * Run docker compose pull
   */
  var start = function(compose, opts) {

    // Log
    log.debug('Starting images from ' + compose);

    // Specify correct options for starting via compose up
    var startOptions = {
      recreate: false,
      stop: false
    };

    // Get our other options
    var options = opts || {};

    // Run command
    return Promise.retry(function() {
      return up(compose, _.extend(startOptions, options));
    });

  };

  /*
   * Run docker compose pull
   */
  var getId = function(compose, opts) {

    // Get our compose files and build the command
    var cmd = getFiles(compose);

    // Get options
    var options = opts || {};

    // Push a project if we have one
    if (options.project) {
      cmd.push('--project-name ' + options.project);
    }

    // Add the search
    cmd.push('ps -q');

    // Specify a service if we have one
    if (options.service) {
      cmd.push(options.service);
    }

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
  var create = function(compose, opts) {

    // Log
    log.debug('Starting images from ' + compose);

    // Specify correct options for starting via compose up
    var createOptions = {
      recreate: false,
      stop: true
    };

    // Get our other options
    var options = opts || {};

    // Run command
    return Promise.retry(function() {
      return up(compose, _.extend(createOptions, options));
    });

  };

  // Build module function.
  return {
    getId: getId,
    create: create,
    start: start,
    stop: stop
  };

};
