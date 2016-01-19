'use strict';

/**
 * Kalabox lib -> engine -> docker module.
 * @module docker
 */

// Build module.
module.exports = function(kbox) {

  // Node
  var assert = require('assert');
  var format = require('util').format;
  var path = require('path');
  var pp = require('util').inspect;

  // Constants
  var PROVIDER_PATH = path.join(__dirname);

  // Npm modules
  var Dockerode = require('dockerode');
  var VError = require('verror');
  var _ = require('lodash');

  // Kalabox Modules
  var Promise = kbox.Promise;

  // Create logging functions.
  var log = kbox.core.log.make('DOCKER ENGINE');

  /*
   * Load the provider module.
   */
  var getProvider = function() {

    // Log.
    log.debug('Initializing machine provider.');

    // Load.
    return Promise.try(function() {
      // Get the provider we need and then load its install routinezzz
      var providerFile = path.join(PROVIDER_PATH, 'machine.js');
      return require(providerFile)(kbox);
    })

    // Log success.
    .tap(function() {
      log.debug('Provider machine initialized.');
    })

    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Failure initializing machine!');
    });

  };

  /*
   * Docker config instance lazy loaded and cached singelton.
   */
  var dockerConfigInstance = function(opts) {

    // Log start.
    log.debug('Initializing docker config.');

    // Get engine config from provider.
    return getProvider().call('engineConfig', opts)
    // Register engine config dependency.
    .tap(function(engineConfig) {
      log.debug('Docker config initialized.');
      kbox.core.deps.remove('engineConfig');
      kbox.core.deps.register('engineConfig', engineConfig);
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error getting docker config.');
    });

  };

  /*
   * Docker instance lazy loaded and cached singleton.
   */
  var dockerInstance = function(opts) {

    // Get docker config.
    return dockerConfigInstance(opts)
    // Initalize a dockerode object.
    .then(function(engineConfig) {
      log.debug('Initializing docker.');
      return new Dockerode(engineConfig);
    })
    // Log success.
    .tap(function() {
      log.debug('Docker initialized.');
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error initializing docker.');
    });

  };

  /*
   * Return a containers name.
   */
  var getContainerName = function(container) {
    var name = container.Names[0];
    if (_.head(name) === '/' || _.head(name) === ' ') {
      name = name.slice(1);
    }
    return name;
  };

  /*
   * Convert a docker container to a generic container.
   */
  var toGenericContainer = function(dockerContainer) {

    // Get name of docker container.
    var containerNameString = getContainerName(dockerContainer);

    // Parse docker container name.
    var name = null;
    try {
      name = kbox.util.docker.containerName.parse(containerNameString);
    } catch (err) {
      name = null;
    }

    // Build generic container.
    if (!name) {
      return null;
    } else {
      return {
        id: dockerContainer.Id,
        name: containerNameString,
        app: name.app,
        kind: name.kind
      };
    }

  };

  /*
   * Query docker for a list of containers.
   */
  var list = function(appName) {

    // Query docker for list of containers.
    return dockerInstance()
    .then(function(dockerInstance) {
      // Make sure to retry call to list containers.
      return Promise.retry(function() {
        return Promise.fromNode(function(cb) {
          dockerInstance.listContainers({all: 1}, cb);
        });
      }, {max: 50});
    })
    // Make sure we have a timeout.
    .timeout(30 * 1000)
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error querying docker for list of containers.');
    })
    // Filter out containers with invalid status.
    .filter(function(data) {
      return data.Status !== 'Removal In Progress';
    })
    // Map docker containers to generic containers.
    .map(toGenericContainer)
    // Filter out nulls and undefineds.
    .filter(_.identity)
    // Filter by app name if an app name was given.
    .then(function(containers) {
      if (appName) {
        return Promise.filter(containers, function(container) {
          return container.app === appName;
        });
      } else {
        return containers;
      }
    });

  };

  /*
   * Find a generic container.
   */
  var findGenericContainer = function(cid) {

    // Get list of generic containers.
    return list()
    // Filter by container id and container name.
    .filter(function(container) {
      return container.id === cid || container.name === cid;
    })
    // Return head on results.
    .then(function(results) {
      assert(results.length < 2);
      return _.head(results);
    });

  };

  /*
   * Find a docker container.
   */
  var findContainer = function(cid) {

    // Find a generic container.
    return findGenericContainer(cid)
    .then(function(container) {
      if (container) {
        // Map container id to a docker container.
        return dockerInstance().call('getContainer', container.id);
      } else {
        return undefined;
      }
    });

  };

  /*
   * Find a docker container and throw error if it does not exist.
   */
  var findContainerThrows = function(cid) {

    if (typeof cid !== 'string') {
      throw new Error(format('Invalid container id: "%s"', pp(cid)));
    }

    // Find container.
    return findContainer(cid)
    // Throw an error if a container was not found.
    .tap(function(container) {
      if (!container) {
        throw new Error(format('The container "%s" does not exist!', pp(cid)));
      }
    });

  };

  /*
   * Inspect a container.
   */
  var inspect = function(cid) {

    // Find a container.
    return findContainerThrows(cid)
    // Inspect container.
    .then(function(container) {
      // Make sure to retry call to inspect.
      return Promise.retry(function() {
        return Promise.fromNode(function(cb) {
          container.inspect(cb);
        });
      }, {max: 50});
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error inspecting container: %s.', cid);
    });
  };

  /*
   * Return true if the container is running otherwise false.
   */
  var isRunning = function(cid) {
    // Validate input.
    return Promise.try(function() {
      if (typeof cid !== 'string') {
        throw new Error('Invalid cid: ' + pp(cid));
      }
    })
    // Inspect.
    .then(function() {
      return inspect(cid);
    })
    .then(function(data) {
      return _.get(data, 'State.Running', false);
    })
    // If the container no longer exists, return false since it isn't running.
    // This will prevent a race condition from happening.
    // Wrap errors.
    .catch(function(err) {
      var expected = format('The container "\'%s\'" does not exist!', cid);
      if (_.endsWith(err.message, expected)) {
        return false;
      } else {
        // Wrap errors.
        throw new VError(err, 'Error querying isRunning: "%s".', pp(cid));
      }
    });
  };

  /*
   * Stop a container.
   */
  var stop = function(cid) {

    // Log start.
    log.info('Stopping container.', cid);

    // Find and bind container.
    return findContainerThrows(cid)
    .bind({})
    .then(function(container) {
      this.container = container;
    })
    // Check if container is running.
    .then(function() {
      return isRunning(cid);
    })
    // Stop container if it is running.
    .then(function(isRunning) {
      var self = this;
      if (!isRunning) {
        // Container is already stopped so do nothing.
        log.info('Container already stopped.', cid);
      } else {
        // Stop container.
        return Promise.fromNode(function(cb) {
          self.container.stop(cb);
        })
        // Log success.
        .then(function() {
          log.info('Container stopped.', cid);
        });
      }
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error stopping container %s.', cid);
    });

  };

  /*
   * Do a docker run
   * @todo: we can get rid of this once docker compose run
   * supports interactive mode on windows
   */
  var run = function(createOpts, opts) {

    // Start by creating a container
    return Promise.fromNode(function(cb) {
      dockerInstance().call('createContainer', createOpts, cb);
    })

    // Container is created now lets attach or collect
    .then(function(container) {

      return Promise.fromNode(function(cb) {
        var attachOpts = {
          stream: true,
          stdout: true,
          stderr: true
        };

        // Attach stdin if we are in attach mode
        if (opts.mode === 'attach') {
          attachOpts.stdin = true;
        }

        container.attach(attachOpts, cb);
      })

      .then(function(stream) {

        // Collector for buffer
        var stdOut = '';
        var stdErr = '';

        // Attaching mode
        if (opts.mode === 'attach') {
          stream.pipe(process.stdout);
          process.stdin.resume();
          process.stdin.setEncoding('utf8');
          if (process.stdin.setRawMode) {
            process.stdin.setRawMode(true);
          }
          process.stdin.pipe(stream);
        }

        // Collecting mode
        else {
          stream.on('data', function(buffer) {
            stdOut = stdOut + String(buffer);
          });
          stream.on('error', function(buffer) {
            stdErr = stdErr + String(buffer);
          });
        }

        stream.on('end', function() {
          if (opts.mode === 'attach') {
            if (process.stdin.setRawMode) {
              process.stdin.setRawMode(false);
            }
            process.stdin.pause();
          }

          console.log('stout');
          console.log(stdOut);
          console.log('steerrrt');
          console.log(stdErr);

          return Promise.fromNode(function(cb) {
            container.remove({force: true, v: true}, cb);
          });
        });

        return Promise.fromNode(function(cb) {
          container.start({}, cb);
        });

      });
    });

  };

  /*
   * Remove a container.
   */
  var remove = function(cid, opts) {

    // Some option handling.
    opts = opts || {};
    opts.v = _.get(opts, 'v', true);
    opts.force = _.get(opts, 'force', false);

    // Log start.
    log.info(format('Removing container %s.', cid), opts);

    // Find a container or throw an error.
    return findContainerThrows(cid)

    // Do stuff with the container
    // @todo: this is kind of sloppy for now
    .then(function(container) {

      // Stop the container if it's running. Unless we are in force mode
      if (!opts.force) {
        return (isRunning(cid))
        .then(function(isRunning) {
          if (isRunning) {
            log.info('Stopping container.', cid);
            return Promise.fromNode(container.stop);
          }
          else {
            return container;
          }
        });
      }

      // Return the continer to eliminate
      else {
        return container;
      }
    })

    // Remove the container.
    .then(function(container) {
      return Promise.fromNode(function(cb) {
        container.remove(opts, cb);
      });
    })

    // Log success.
    .then(function() {
      log.info('Container removed.', cid);
    })

    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error removing container %s.', cid);
    });

  };

  return {
    findContainer: findContainer,
    findContainerThrows: findContainerThrows,
    getProvider: getProvider,
    inspect: inspect,
    isRunning: isRunning,
    list: list,
    remove: remove,
    run: run,
    stop: stop
  };

};
