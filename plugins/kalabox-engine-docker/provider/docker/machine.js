'use strict';

/**
 * Module to wrap and abstract access to docker machine.
 * @module docker
 */

// Cache inspect data
var inspectData = {};

module.exports = function(kbox) {

  // Node modules
  var path = require('path');

  // NPM modules
  var VError = require('verror');
  var _ = require('lodash');
  var fs = require('fs-extra');

  // Kalabox modules
  var deps = kbox.core.deps;
  var Promise = kbox.Promise;
  var bin = require('./lib/bin.js')(kbox);
  var env = require('./lib/env.js')(kbox);
  var docker = require('./docker.js')(kbox);

  // Get our docker machine executable
  var MACHINE_EXECUTABLE = bin.getMachineExecutable();

  // Set of logging functions.
  var log = kbox.core.log.make('MACHINE');

  /*
   * Return machine config
   * @todo: get this to handle multiple machines?
   */
  var getMachine = _.once(function() {
    return kbox.core.deps.get('providerConfig').machine.kalabox;
  });

  /*
   * Run a provider command in a shell.
   */
  var shProvider = function(cmd, opts) {

    // Set the machine env
    env.setDockerEnv();

    // Retry
    return Promise.retry(function() {

      // Build and log the command
      var run = [MACHINE_EXECUTABLE].concat(cmd).concat(getMachine().name);
      log.debug(run);

      // Run the command
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
          throw new VError(err);
        });

      });

    });

  };

  /*
   * Create a machine
   */
  var create = function(opts) {

    // Build command and options with defaults
    // Core create command
    var createCmd = ['create', '--driver', getMachine().driver];

    // Get driver options
    var createOptions = getMachine().driveropts || [];

    // Check if we have a prepackaged binary
    // if it exists, move it into the filesystem and use that instead of
    // a remote url
    var isoName = path.basename(getMachine().isourl);
    var prepackagedIso = path.resolve(process.cwd(), 'deps', 'iso', isoName);

    // If exists use local iso
    if (fs.existsSync(prepackagedIso)) {
      var sysConfRoot = kbox.core.deps.get('globalConfig').sysConfRoot;
      var dest = path.join(sysConfRoot, isoName);
      fs.writeFileSync(dest, fs.readFileSync(prepackagedIso));
      createOptions.unshift('file://' + dest);
    }
    else {
      createOptions.unshift(getMachine().isourl);
    }

    // Add the key for the iso
    createOptions.unshift('--virtualbox-boot2docker-url');

    // Add otherOpts
    _.forEach(getMachine().otheropts, function(option) {
      createOptions.push(option);
    });

    // Add some more dynamic options
    if (opts.disksize && getMachine().driver === 'virtualbox') {
      createOptions.unshift(opts.disksize);
      createOptions.unshift('--virtualbox-disk-size');
    }

    // Run provider command.
    var run = _.flatten(createCmd.concat(createOptions));
    return shProvider(run, {mode: 'collect'})

    // Handle relevant create errors
    .catch(function(err) {
      throw new VError(err, 'Error initializing machine.', run);
    })

    // Import an internal archive if it exists
    // @todo: this probably should live somewhere else in the future
    .then(function() {

      // Check for predownloaded image archivces and copy them over if they exist
      // This only works in gui mode
      if (deps.get('mode') === 'gui') {

        // This is where our predownloads images should live
        var imageRoot = path.resolve(process.cwd(), 'deps', 'images');
        var archivePath = path.join(imageRoot, 'images.tar.gz');

        // Check if we have the that might contain predownlaods
        if (fs.existsSync(archivePath)) {

          // Basic log info
          log.info('Importing docker images from ' + archivePath);

          // Source and destination dirs
          var source = archivePath;
          var write = path.join(kbox.util.disk.getTempDir(), 'images.tar.gz');

          // If the source exists write it to the dest and remove
          // from the downloads array
          // @todo: something async so we can error check?
          // @todo: what about files that need extraction?
          if (fs.existsSync(source)) {
            fs.writeFileSync(write, fs.readFileSync(source));
          }

          // Load the archive
          return docker.load(write);

        }
      }

    });

  };

  /*
   * Machine start helper
   */
  var _up = function() {

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
   * Bring machine up.
   */
  var up = function(opts) {

    // Check to see if we need to create a machine or not
    return Promise.try(function() {
      return vmExists();
    })

    // Create the machine if needed.
    .then(function(exists) {
      if (!exists) {
        return create(opts);
      }
    })

    // Bring machine up.
    .then(function() {
      return _up();
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
   * Return status of machine.
   */
  var getIso = function() {
    // Get status.
    return shProvider(['upgrade'], {mode: 'collect'})
    .catch(function(/*err*/) {
      return up()
      .then(function() {
        throw new VError('Need to start the machine to upgrade');
      });
    });
  };

  /*
   * Return machine's IP address.
   */
  var getIp = function() {
    return Promise.resolve(getMachine().ip);
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
  var getEngineConfig = function(opts) {

    opts = opts || {};

    // Inspect our machine so we can get certificates
    return inspect()

    // Build our config
    .then(function(data) {
      var auth = data.HostOptions.AuthOptions;
      return {
        protocol: 'https',
        host: getMachine().ip,
        machine: getMachine().name,
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
    return [getMachine().ip];
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
