'use strict';

/**
 * Module to wrap and abstract access to docker machine.
 * @module docker
 */

// Cache inspect data
var inspectData = {};

module.exports = function(kbox) {

  // NPM modules
  var VError = require('verror');
  var _ = require('lodash');
  var fs = require('fs-extra');

  // Kalabox modules
  var Promise = kbox.Promise;
  var bin = require('./lib/bin.js')(kbox);
  var env = require('./lib/env.js')(kbox);

  // Get our docker machine executable
  var MACHINE_EXECUTABLE = bin.getMachineExecutable();

  // Set of logging functions.
  var log = kbox.core.log.make('MACHINE');

  /*
   * Run a provider command in a shell.
   */
  var shProvider = function(cmd, opts) {

    // Set the machine env
    env.setDockerEnv();

    // Retry
    return Promise.retry(function() {

      // Build and log the command
      var run = [MACHINE_EXECUTABLE].concat(cmd).concat('Kalabox2');
      log.debug(run);

      // Run the command
      return bin.sh(run, opts)

      // Throw an error
      .catch(function(err) {
        throw new VError(err);
      });

    });

  };

  /*
   * Bring machine up.
   */
  var up = function() {

    // Get status
    return isDown()

    // Only start if we aren't already
    .then(function(isDown) {
      if (isDown) {
        return shProvider(['start'], {mode: 'collect'});
      }
    })

    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error bringing machine up.');
    });

  };

  /*
   * Return status of machine.
   * @todo: clean this up
   */
  var getStatus = function() {

    // Get status.
    return shProvider(['status'], {silent:true})
    // Do some lodash fu to get the status
    .then(function(result) {
      log.debug('Current status', result);
      return _.trim(result.toLowerCase());
    });

  };

  /*
   * Bring machine down.
   */
  var down = function() {

    // Get provider status.
    return isUp()
    // Shut provider down if its status is running.
    .then(function(isUp) {
      if (isUp) {
        // Retry to shutdown if an error occurs.
        return shProvider(['stop'], {mode: 'collect'});
      }
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error while shutting down.');
    });

  };

  /*
   * Return true if machine is up.
   */
  var isUp = function() {

    // Return true if status is 'running'.
    return getStatus()
    .then(function(status) {
      return (status === 'running');
    });

  };

  /*
   * Return true if machine is down.
   */
  var isDown = function() {

    // Return the opposite of isUp.
    return isUp()
    .then(function(isUp) {
      return !isUp;
    });

  };

  /*
   * Inspect
   */
  var inspect = function() {

    // Return the cached data if its there
    if (!_.isEmpty(inspectData)) {
      return Promise.resolve(inspectData);
    }

    // Else query for it and set it in the cache
    return shProvider(['inspect'], {silent: true})

    // We've got data lets check if we can parse it and then cache it
    .then(function(data) {

      // Check if we have valid JSON
      try {
        JSON.parse(data);
      }
      // If not we have a problem
      catch (e) {
        throw new Error(e);
      }

      // Try was good so we can set cache and return the parsed json
      inspectData = JSON.parse(data);
      return inspectData;
    })

    // Host does not exist, lets return {}
    // @todo: better checks here?
    .catch(function(/*err*/) {
      return {};
    });

  };

  /*
   * Return machine's IP address.
   */
  var getIp = function() {

    // Inspect our machine so we can get ips
    return inspect()

    // Try to get config from inspect data
    .then(function(data) {
      return data.Driver.IPAddress;
    })

    // If our inspect data is blank try to query for it
    // but only if the machine is up
    .then(function(ip) {
      if (_.isEmpty(ip)) {
        return isUp()
        .then(function(up) {
          return (up) ? shProvider(['ip'], {silent: true}) : ip;
        });
      }
      else {
        return ip;
      }
    })

    // If our query data is blank make assumptions
    .then(function(ip) {
      return (_.isEmpty(ip)) ? '10.13.37.100' : ip;
    })

    // Cleanliness is next to godliness
    .then(function(ip) {
      return _.trim(ip);
    });

  };

  /*
   * Check to see if we have a Kalabox2 VM
   */
  var vmExists = function() {

    // See if there is any info
    return inspect()

    // if we have dont have an empty object then the vm exists
    .then(function(data) {
      return !_.isEmpty(data);
    });

  };

  /*
   * Return true if machine and Kalabox2 VM is installed.
   */
  var isInstalled = function() {

    // set the machine env
    env.setDockerEnv();

    // We have the machine executable now return whether we have the
    // vm or not
    if (kbox.util.shell.which(MACHINE_EXECUTABLE) === MACHINE_EXECUTABLE) {
      return Promise.resolve(vmExists());
    }

    // We are not installed
    return Promise.resolve(false);

  };

  /*
   * Return cached instance of engine config.
   */
  var getEngineConfig = function() {

    // Inspect our machine so we can get some dataz
    return inspect()

    // Get our config
    .then(function(data) {

      // Get our auth options for later
      var auth = data.HostOptions.AuthOptions;

      // Get our IP
      return getIp()

      // Build the CONFIG
      .then(function(ip) {
        return {
          protocol: 'https',
          host: ip,
          machine: 'Kalabox2',
          port: '2376',
          certDir: auth.CertDir,
          ca: fs.readFileSync(auth.CaCertPath),
          cert: fs.readFileSync(auth.ClientCertPath),
          key: fs.readFileSync(auth.ClientKeyPath)
        };
      });

    });

  };

  /*
   * @todo: @pirog - I'm not touching this one! :)
   */
  var path2Bind4U = function(path) {
    var bind = path;
    if (process.platform === 'win32') {
      bind = path
        .replace(/\\/g, '/')
        .replace('C:/', 'c:/')
        .replace('c:/', '/c/');
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
