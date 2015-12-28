/**
 * Module to wrap and abstract access to docker machine.
 * @module machine
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

  // Kalabox modules
  var Promise = kbox.Promise;
  var bin = require('./lib/bin.js')(kbox);
  var env = require('./lib/env.js')(kbox);
  var net = require('./lib/net.js')(kbox);

  // Set some machine things
  var MACHINE_EXECUTABLE = bin.getMachineExecutable();
  var MACHINE_NAME = 'Kalabox2';
  var MACHINE_IP = '10.13.37.42';

  // Kalabox default machine options
  var DEFAULT_DRIVER = 'virtualbox';
  var DEFAULT_ISO = 'https://api.github.com/repos/kalabox/kalabox-iso/releases';
  var DEFAULT_HOST_CIDR = '10.13.37.1/24';
  var DEFAULT_DOCKER_DNS = ['172.17.0.1', '208.67.222.222', '208.67.220.220'];
  var DEFAULT_MEMORY = '2048';

  // Set of logging functions.
  var log = kbox.core.log.make('MACHINE');

  /*
   * Return machine name
   * @todo: get this to handle multiple machine names?
   */
  var useMachine = function() {
    return MACHINE_NAME;
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
    if (_.includes(msg, 'Host does not exist: "' + MACHINE_NAME + '"')) {
      return false;
    }

    // Otherwise throw an error
    return true;

  };

  /*
   * Run a provider command in a shell.
   */
  var shProvider = function(cmd) {

    // Set the machine env
    env.setMachineEnv();

    // Run a provider command in a shell.
    return bin.sh([MACHINE_EXECUTABLE].concat(cmd).concat(useMachine()))

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
        if (!_.includes(data, MACHINE_IP)) {

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
          log.info('Static IP set correctly at ' + MACHINE_IP);
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
        '--driver ' + DEFAULT_DRIVER,
      ];

      // Basic options
      var initOptions = [
        '--virtualbox-boot2docker-url ' + DEFAULT_ISO,
        '--virtualbox-memory ' + DEFAULT_MEMORY,
        '--virtualbox-hostonly-cidr ' + DEFAULT_HOST_CIDR,
        '--virtualbox-host-dns-resolver'
      ];

      // Add DNS
      _.forEach(DEFAULT_DOCKER_DNS, function(dns) {
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

    // Emit pre-up event.
    return Promise.try(kbox.core.events.emit, 'pre-up')

    // Check to see if we need to create a machine or not
    .then(function() {
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
    })

    // Emit post-up event.
    .then(function() {
      return kbox.core.events.emit('post-up');
    });

  };

  /*
   * Return status of machine.
   * @todo: clean this up
   */
  var getStatus = function() {

    // Set the machine ENV explicitly for this one because we arent
    // routing through shProvider
    env.setMachineEnv();

    // Get status.
    return Promise.retry(function(counter) {
      log.debug(format('Checking status [%s].', counter));
      return shProvider(['ls']);
    })
    // Do some lodash fu to get the status
    .then(function(result) {

      // Find the status of our machine in a parsed result
      var status = _.result(_.find(shellParser(result), function(machine) {
        return machine.NAME === MACHINE_NAME;
      }), 'STATE');

      // Tell us WTFIGO
      log.info(MACHINE_NAME + ' is ' + status);

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
        // Emit pre down event.
        return Promise.try(kbox.core.events.emit, 'pre-down')
        // Retry to shutdown if an error occurs.
        .then(function() {
          return Promise.retry(function(counter) {
            log.info(format('Shutting down [%s].', counter));
            return shProvider(['stop']);
          });
        })
        // Log success.
        .then(function() {
          log.info('Shutdown successful.');
        })
        // Emit post down event.
        .then(function() {
          return kbox.core.events.emit('post-down');
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
    return Promise.resolve(MACHINE_IP);
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
    return shProvider(['inspect'])

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
    env.setMachineEnv();

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

    // Get ip address of machine.
    return getIp()
    .then(function(ip) {

      // Build docker config.
      var config = {
        protocol: 'http',
        host: ip,
        port: '2375'
      };

      _.extend(config, opts);

      return config;

    });

  };

  /*
   * @todo: @pirog - What is this for?
   * @todo: @bcauldwell - I think we can remove this, need to remove from
   * core provider.js as well
   */
  var hasTasks = function() {
    return Promise.resolve(true);
  };

  /*
   * Get list of server IP addresses.
   */
  var getServerIps = function() {
    return [MACHINE_IP];
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
    hasTasks: hasTasks,
    isDown: isDown,
    isInstalled: isInstalled,
    isUp: isUp,
    name: 'machine',
    path2Bind4U: path2Bind4U,
    up: up
  };

};
