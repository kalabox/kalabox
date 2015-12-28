/**
 * Module to wrap and abstract access to boot2docker.
 * @module b2d
 */

'use strict';

module.exports = function(kbox) {

  // Node modules
  var assert = require('assert');
  var format = require('util').format;
  var path = require('path');

  // NPM modules
  var VError = require('verror');
  var _ = require('lodash');

  // Kalabox modules
  var Promise = kbox.Promise;
  var bin = require('./lib/bin.js')(kbox);
  var env = require('./lib/env.js')(kbox);
  var net = require('./lib/net.js')(kbox);

  // Get boot2docker and ssh executable path.
  var B2D_EXECUTABLE = bin.getB2DExecutable();
  var SSH_EXECUTABLE = bin.getSSHExecutable();

  // Set of logging functions.
  var log = kbox.core.log.make('BOOT2DOCKER');

  // Define kalabox SSH Key
  var KALABOX_SSH_KEY = 'boot2docker.kalabox.id_rsa';

  /*
   * Get dynamic flags
   */
  var getFlags = function() {

    // Start up our options
    var options = [];

    // Use a custom SSH key to avoid SSH mixup with other B2D intances
    var sshPath = path.join(kbox.core.deps.get('config').home, '.ssh');
    options.push('--sshkey="' + path.join(sshPath, KALABOX_SSH_KEY) + '"');

    // Try to explicitly set hostIP on win32
    // @todo: we might not need this since we check and correct later
    if (process.platform === 'win32') {
      options.push('--hostip="' + net.hostOnlyIp + '"');
    }

    // Limit number of retries to increase performance of non-HOSTIP Vms
    options.push('--retries=50');

    // Concat and return
    return options.join(' ');

  };

  /*
   * Run a provider command in a shell.
   */
  var shProvider = function(cmd) {

    // Set the B2D env
    env.setB2DEnv();

    // Run a provider command in a shell.
    return bin.sh([B2D_EXECUTABLE].concat(getFlags()).concat(cmd));

  };

  /*
   * Run a command inside the provider
   */
  var shProviderSSH = function(cmd) {

    // Set the B2D env
    env.setB2DEnv();

    /*
     * Return ssh options
     */
    var getSSHOptions = function() {

      // Get SSHkey Path
      var sshPath = path.join(kbox.core.deps.get('config').home, '.ssh');

      // Needed SSH opts
      var opts = [
        '-o IdentitiesOnly=yes',
        '-o StrictHostKeyChecking=no',
        '-o UserKnownHostsFile=/dev/null',
        '-o LogLevel=quiet',
        '-p 2022',
        '-i "' + path.join(sshPath, KALABOX_SSH_KEY) + '"',
        'docker@localhost'
      ];

      // concat and return all options
      return opts.join(' ');
    };

    // Run a provider command in a shell.
    return bin.sh([SSH_EXECUTABLE].concat(getSSHOptions()).concat(cmd));

  };

  /*
   * Get Manual set IP command
   */
  var setProviderIPCmd = function() {
    //@todo: do we need to do this on eth0 as well?
    return [
      'sudo',
      'ifconfig',
      'eth1',
      net.defaultIp,
      'netmask',
      '255.255.255.0',
      'broadcast',
      '10.13.37.255',
      'up'
    ].join(' ');
  };

  /*
   * Init boot2docker
   */
  var init = function(opts) {

    return Promise.retry(function(counter) {

      // Log start.
      log.info(kbox.util.format('Initializing boot2docker [%s].', counter));

      // Build command.
      var initCmd = ['init'];

      // Add disksize option to command.
      if (opts.disksize) {
        initCmd.unshift(kbox.util.format('--disksize=%s', opts.disksize));
      }

      // Run provider command.
      return shProvider(initCmd)

      // Wrap errors.
      .catch(function(err) {
        log.info('Initializing boot2docker failed, retrying.', err);
        throw new VError(err, 'Error initializing boot2docker.', initCmd);
      });

    });
  };

  /*
   * Boot2docker up helper
   */
  var _up = function() {
    // Retry the upping
    return Promise.retry(function(counter) {

      // Log start.
      log.info(kbox.util.format('Bringing boot2docker up [%s].', counter));

      // Run provider command.
      return shProvider(['up'])

      // Wrap errors.
      .catch(function(err) {
        // Let's see if this problem is caused by missing VB's kernel modules
        return (bin.checkVBModules())

        .then(function(modulesAreUp) {
          if (!modulesAreUp) {
            log.info('VirtualBox\'s kernel modules seem to be down.' +
                ' Trying to bring them up.', err);
            return bin.bringVBModulesUp();
          } else {
            // The problem was something else, let's just fail
            log.info('Bringing up boot2docker failed, retrying.', err);
            throw new VError(err, 'Error bringing boot2docker up.');
          }
        })

        .then(function(modulesAreUp) {
          if (!modulesAreUp) {
            log.info('Bringing up VirtualBox\'s modules failed unrecoverably.');
            throw new VError(err, 'Error bringing VirtualBox\'s modules up.');
          } else {
            throw new VError('VirtualBox\'s modules seem to be up. Retrying.');
          }
        });

      })

      .then(function(output) {

        // If B2D reports no IP found we will try to set it manually
        // @todo: tighter check here
        if (_.includes(output, 'No IP') || _.includes(output, 'Error')) {

          // Log falure
          log.info('Boot2docker failed to provide an IP. Setting manually.');

          // Set manually
          return shProviderSSH(setProviderIPCmd())

          // Retry up so we can grab the correct adapter
          .then(function() {
            return up();
          });

        }
      });

    });
  };

  /*
   * Bring boot2docker up.
   */
  var up = function(opts) {

    // Log start.
    log.info('Starting up.', opts);

    // Emit pre-up event.
    return Promise.try(kbox.core.events.emit, 'pre-up')

    // Init boot2docker.
    .then(function() {
      return init(opts);
    })

    // Check the status so we know what to do on the next step
    .then(function() {
      return getStatus();
    })

    // Manually do VBOX dns handling
    .tap(function(status) {
      if (status !== 'running') {
        return net.setHostDnsResolver();
      }
    })

    // Manually do VBOX file sharing on nix
    .tap(function(status) {
      if (process.platform === 'linux' && status !== 'running') {
        return net.linuxSharing();
      }
    })

    // Verify our networking is setup correctly on windows
    .then(function() {
      if (process.platform === 'win32') {
        return net.verifyWindowsNetworking();
      }
    })

    // Bring boot2docker up.
    .then(function() {
      return _up();
    })

    // Log success.
    .then(function() {
      log.info('Boot2docker is up.');
    })

    // Emit post-up event.
    .then(function() {
      return kbox.core.events.emit('post-up');
    });

  };

  /*
   * Return status of boot2docker.
   */
  var getStatus = function() {

    // Get status.
    return Promise.retry(function(counter) {
      log.debug(format('Checking status [%s].', counter));
      return shProvider(['status']);
    })
    // Trim off newline.
    .then(function(status) {
      return _.trim(status, '\n');
    });

  };

  /*
   * Bring boot2docker down.
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
            return shProvider(['down']);
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
   * Return status of boot2docker.
   */
  var getIso = function() {

    // Get status.
    return Promise.retry(function(counter) {
      log.debug(format('Checking for new ISO [%s].', counter));
      return shProvider(['download']);
    });

  };

  /*
   * Return boot2docker's IP address.
   */
  var getIp = function() {

    // Get IP address.
    return Promise.retry(function() {
      return shProvider(['ip']);
    })
    // Remove endline.
    .then(function(ip) {

      // Trim the IP to remove newline cruft
      var host = _.trim(ip, '\n');

      // Check to see if we somehow landed on the wrong IP
      var ipSegs = host.split('.');
      if (ipSegs[3] !== '42') {
        // Try to manually set to correct and then try to grab IP again
        return shProviderSSH(setProviderIPCmd())
        .then(function() {
          return up();
        })
        .then(function() {
          return getIp();
        });
      }
      else {
        return host;
      }
    });

  };

  /*
   * Return true if boot2docker is up.
   */
  var isUp = function() {

    // Return true if status is 'running'.
    return getStatus()
    .then(function(status) {
      return (status === 'running');
    });

  };

  /*
   * Return true if boot2docker is down.
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
    return shProvider(['info'])

    // if there is output then we are probably good
    // @todo: we can do a stronger check here
    .then(function(output) {
      if (output) {
        return true;
      }
    })

    // If there is an error then we probably need to run the install
    .catch(function(/*err*/) {
      return false;
    });

  };

  /*
   * Return true if boot2docker is installed.
   */
  var isInstalled = function() {

    // set the b2d env
    env.setB2DEnv();

    // Grab correct path checking tool
    // @todo: handle alternate shells
    var which = (process.platform === 'win32') ? 'where' : 'which';
    // Run command to find location of boot2docker.
    return bin.sh([which, path.basename(B2D_EXECUTABLE)])
    .then(function(output) {
      if (output) {
        // If a location was return, return value of hasProfile.
        return env.hasProfile()
        // Do a final check to see if a Kalabox2 VM exists
        .then(function(hasProfile) {
          return hasProfile && vmExists();
        });
      }
      else {
        // Boot2docker does not exist so return false.
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

    // Get ip address of boot2docker.
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

    // Get instance of boot2docker profile object.
    return env.profileInstance()
    // Return list of possibel IP addresses.
    .then(function(profile) {

      // Get upper and lower IP address octets from profile.
      var upperIp = _.trim(profile.UpperIP, '"').split('.');
      var lowerIp = _.trim(profile.LowerIP, '"').split('.');

      // Assert the start of upper IP and lower IP are the same.
      assert(_.isEqual(_.take(upperIp, 3), _.take(lowerIp, 3)));

      // Transform to integers and add one to the upper to accomodate how
      // _.range() works
      var bottomIp = parseInt(_.last(lowerIp));
      var topIp = parseInt(_.last(upperIp)) + 1;

      // Get range of last octets for what will be a full list of possible ips.
      var lastOctets = _.range(bottomIp, topIp);

      // Map range of last octets to IP addresses.
      return _.map(lastOctets, function(lastOctet) {
        // Get first 3 octets from upper IP address.
        var octets = _.take(upperIp, 3);
        // Add last octet.
        octets.push(lastOctet);
        // Format octets to a IP string.
        return octets.join('.');
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
    else if (process.platform === 'linux')  {
      bind = path.replace('/home', '/Users');
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
    sshKey: KALABOX_SSH_KEY,
    name: 'boot2docker',
    path2Bind4U: path2Bind4U,
    up: up
  };

};
