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
  var shCompose = function(cmd) {

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
      return bin.sh([COMPOSE_EXECUTABLE].concat(cmd));

    });

  };

  /*
   * Expand dirs to an array of kalabox-compose files
   */
  var getFiles = function(dirs) {
    return _.map(dirs, function(dir) {
      return ['--file', path.join(dir, 'kalabox-compose.yml')].join(' ');
    });
  };

  /*
   * Run docker compose pull
   */
  var pull = function(dirs) {

    // Get our compose files and build the command
    var cmd = getFiles(dirs);
    cmd.push('pull');

    // Log
    log.debug('Pulling images from ' + dirs);

    // Run command
    return Promise.retry(function() {
      return shCompose(cmd);
    });

  };

  /*
   * Run docker compose pull
   */
  var create = function(dirs, opts) {

    // Default options
    var defaults = {
      background: true,
      recreate: false,
    };

    // Merge in defaults
    opts = _.merge(defaults, opts);

    // Get our compose files
    var files = getFiles(dirs);

    // Log
    log.debug('Creating containers from ' + dirs);

    // Run up command
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

      // Up us
      return shCompose(files.concat(['up']).concat(options));
    })

    // Then we want to stop the containers so this works the same as
    // docker.create
    .then(function() {
      return Promise.retry(function() {
        return shCompose(files.concat(['stop']));
      });
    });

  };

  // Build module function.
  return {
    pull: pull,
    create: create
  };

};
