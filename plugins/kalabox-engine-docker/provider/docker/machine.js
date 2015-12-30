/**
 * Module to wrap and abstract access to docker machine.
 * @module docker
 */

'use strict';

module.exports = function(kbox) {

  // Node modules
  var format = require('util').format;
  var path = require('path');

  // NPM modules
  var VError = require('verror');
  var _ = require('lodash');
  var shellParser = require('node-shell-parser');
  var fs = require('fs-extra');

  // Kalabox modules
  var Promise = kbox.Promise;
  var bin = require('./lib/bin.js')(kbox);
  var env = require('./lib/env.js')(kbox);
  var net = require('./lib/net.js')(kbox);

    // Provider config
  var providerConfig = kbox.core.deps.get('providerConfig');

  // Set some machine things
  var MACHINE_CONFIG = providerConfig.machine;
  var MACHINE_EXECUTABLE = bin.getMachineExecutable();

  // Set of logging functions.
  var log = kbox.core.log.make('MACHINE');

  /*
   * Return machine name
   * @todo: get this to handle multiple machine names?
   */
  var useMachine = function() {
    return MACHINE_CONFIG.name;
  };

  /*
   * Helper to parse errors better
   */
  var shProviderError = function(msg) {

    // This will always happen on create with our custom iso
    if (_.includes(msg, 'Unable to verify the Docker daemon is listening')) {
      return false;
    }

    // This is ok too
    if (_.includes(msg, 'Host does not exist: "' + useMachine() + '"')) {
      return false;
    }

    // Otherwise throw an error
    return true;

  };

  /*
   * Run a provider command in a shell.
   */
  var shProvider = function(cmd, opts) {

    // Set the machine env
    env.setDockerEnv();

    // Run a provider command in a shell.
    var run = [MACHINE_EXECUTABLE].concat(cmd).concat(useMachine());
    return bin.sh(run, opts)

    // See if we need to recompile our kernel mod
    // on linux also we assume a few select errors
    // are actually ok
    .catch(function(err) {

      // Let's see if this problem is caused by missing VB's kernel modules
      // @todo: On machine we might need to stop first here
      return bin.checkVBModules()

      // If our modules are down let's try to get them into a good state
      .then(function(modulesAreUp) {
        if (!modulesAreUp) {

          // Attempt to bring them up
          return bin.bringVBModulesUp()

          // Now retry the create regardless
          .then(function() {
            throw new VError('Retrying...');
          });
        }
      })

      // If our kernel isn't the issue
      .then(function() {
        if (shProviderError(err.message)) {
          throw new VError(err);
        }
      });

    });

  };

  /*
   * Do a check to verify our static IP is good
   */
  var verifyStaticIp = function() {

    // Try a few times
    return Promise.retry(function() {

      // Inspect our machine
      return shProvider(['ip'])

      // Parse the data and correct if needed
      .then(function(data) {

        // Correct if not set
        if (!_.includes(data, MACHINE_CONFIG.ip)) {

          // Run the corrector command
          var ssh = [MACHINE_EXECUTABLE, 'ssh'].concat(useMachine());
          var cmd = ['sudo', '/opt/bootsync.sh'];
          return bin.sh(ssh.concat(cmd))

          // Retry and see if we are good now
          .then(function() {
            throw new VError('Rechecking static IP');
          });
        }

        // Say we are good
        else {
          log.info('Static IP set correctly at ' + MACHINE_CONFIG.ip);
        }

      });
    });

  };

  /*
   * Init machine
   */
  var init = function(opts) {

    return Promise.retry(function(counter) {

      // Log start.
      log.info(kbox.util.format('Initializing docker machine [%s].', counter));

      // Build command and options with defaults
      // @todo: handle other drivers?
      // @todo: allow overrides from opts?
      // Core create command
      var initCmd = [
        'create',
        '--driver ' + MACHINE_CONFIG.driver,
      ];

      // Basic options
      var initOptions = [
        '--virtualbox-boot2docker-url ' + MACHINE_CONFIG.iso,
        '--virtualbox-memory ' + MACHINE_CONFIG.memory,
        '--virtualbox-hostonly-cidr ' + MACHINE_CONFIG.hostcidr,
        '--virtualbox-host-dns-resolver'
      ];

      // Add DNS
      _.forEach(MACHINE_CONFIG.dns, function(dns) {
        initOptions.push('--engine-opt dns=' + dns);
      });

      // Add disksize option.
      if (opts.disksize) {
        initOptions.unshift('--virtualbox-disk-size ' + opts.disksize);
      }

      // Run provider command.
      var run = initCmd.concat(initOptions);
      return shProvider(run)

      // Handle relevant create errors
      .catch(function(err) {
        log.info('Initializing docker machine failed, retrying.', err);
        throw new VError(err, 'Error initializing machine.', run);
      })

      // Verify our networking is setup correctly on windows
      .then(function() {
        if (process.platform === 'win32') {
          return net.verifyWindowsNetworking();
        }
      });

    });
  };

  /*
   * Machine start helper
   */
  var _up = function() {
    // Retry the upping
    return Promise.retry(function(counter) {

      // Log start.
      log.info(kbox.util.format('Bringing machine up [%s].', counter));

      var stoppedStates = ['paused', 'saved', 'stopped', 'error'];

      // Get status
      return getStatus()

      // Only start if we aren't already
      .then(function(status) {
        if (_.includes(stoppedStates, status)) {
          return shProvider(['start']);
        }
      })

      // Wrap errors.
      .catch(function(err) {
        log.info('Bringing up machine failed, retrying.', err);
        throw new VError(err, 'Error bringing machine up.');
      });

    });
  };

  /*
   * Bring machine up.
   */
  var up = function(opts) {

    // Log start.
    log.info('Starting up.', opts);

    // Check to see if we need to create a machine or not
    return Promise.try(function() {
      return vmExists();
    })

    // Create the machine if needed.
    .then(function(exists) {
      if (!exists) {
        return init(opts);
      }
    })

    // Bring machine up.
    .then(function() {
      return _up();
    })

    // Verify static IP is set
    .then(function() {
      return verifyStaticIp();
    })

    // Log success.
    .then(function() {
      log.info('Machine is up.');
    });

  };

  /*
   * Return status of machine.
   * @todo: clean this up
   */
  var getStatus = function() {

    // Set the machine ENV explicitly for this one because we arent
    // routing through shProvider
    env.setDockerEnv();

    // Get status.
    return Promise.retry(function(counter) {
      log.debug(format('Checking status [%s].', counter));
      return shProvider(['ls'], {silent:true});
    })
    // Do some lodash fu to get the status
    .then(function(result) {

      // Find the status of our machine in a parsed result
      var status = _.result(_.find(shellParser(result), function(machine) {
        return machine.NAME === MACHINE_CONFIG.name;
      }), 'STATE');

      // Tell us WTFIGO
      log.info(MACHINE_CONFIG.name + ' is ' + status);

      return status.toLowerCase();
    });

  };

  /*
   * Bring machine down.
   */
  var down = function() {

    // Get provider status.
    return getStatus()
    // Shut provider down if its status is running.
    .then(function(status) {
      if (status === 'running') {
        // Retry to shutdown if an error occurs.
        return Promise.try(function() {
          return Promise.retry(function(counter) {
            log.info(format('Shutting down [%s].', counter));
            return shProvider(['stop']);
          });
        })
        // Log success.
        .then(function() {
          log.info('Shutdown successful.');
        });
      } else {
        log.info('Already shutdown.');
      }
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error while shutting down.');
    });

  };

  /*
   * Return status of machine.
   */
  var getIso = function() {
    // Get status.
    return Promise.retry(function(counter) {
      log.debug(format('Checking for new ISO [%s].', counter));
      return shProvider(['upgrade'])
      .catch(function(/*err*/) {
        return up()
        .then(function() {
          throw new VError('Need to start the machine to upgrade');
        });
      });
    });
  };

  /*
   * Return machine's IP address.
   */
  var getIp = function() {
    return Promise.resolve(MACHINE_CONFIG.ip);
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
    .then(_.negate);

  };

  /*
   * Check to see if we have a Kalabox2 VM
   */
  var vmExists = function() {

    // See if there is any info
    return shProvider(['inspect'], {silent:true})

    // if there is output then we are probably good
    // @todo: we can do a stronger check here
    .then(function(output) {
      if (output) {
        return true;
      }
    })

    // If there is an error then we probably need to run the create
    .catch(function(/*err*/) {
      return false;
    });

  };

  /*
   * Return true if machine and Kalabox2 VM is installed.
   */
  var isInstalled = function() {

    // set the machine env
    env.setDockerEnv();

    // Grab correct path checking tool
    var which = (process.platform === 'win32') ? 'where' : 'which';
    // Run command to find location of machine.
    return bin.sh([which, path.basename(MACHINE_EXECUTABLE)])
    .then(function(output) {
      if (output) {
        return vmExists();
      }
      else {
        // Kalabox2 machine does not exist so return false.
        return false;
      }
    })

    // Which returned an error, this should mean it does not exist.
    .catch(function(/*err*/) {
      return false;
    });

  };

  /*
   * Return cached instance of engine config.
   */
  var getEngineConfig = function(opts) {

    opts = opts || {};

    // Inspect our machine so we can get certificates
    return shProvider(['inspect'], {silent:true})

    // Build our config
    .then(function(data) {
      var auth = JSON.parse(data).HostOptions.AuthOptions;
      return {
        protocol: 'https',
        host: MACHINE_CONFIG.ip,
        machine: MACHINE_CONFIG.name,
        port: '2376',
        certDir: auth.CertDir,
        ca: fs.readFileSync(auth.CaCertPath),
        cert: fs.readFileSync(auth.ClientCertPath),
        key: fs.readFileSync(auth.ClientKeyPath)
      };
    })

    // Mix in options and return
    .then(function(config) {
      _.extend(config, opts);
      return config;
    });

  };

  /*
   * Get list of server IP addresses.
   */
  var getServerIps = function() {
    return [MACHINE_CONFIG.ip];
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
    getServerIps: getServerIps,
    getIso: getIso,
    isDown: isDown,
    isInstalled: isInstalled,
    isUp: isUp,
    name: 'docker',
    path2Bind4U: path2Bind4U,
    up: up
  };

};
