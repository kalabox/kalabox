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
  var pp = require('util').inspect;

  // Npm modules
  var Dockerode = require('dockerode');
  var VError = require('verror');
  var _ = require('lodash');

  // Kalabox Modules
  var Promise = kbox.Promise;

  /*
   * Docker config instance lazy loaded and cached singelton.
   */
  var dockerConfigInstance = function() {

    return Promise.try(function() {
      return kbox.core.deps.get('engineConfig');
    })

    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error getting engine config.');
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
      return new Dockerode(engineConfig);
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
      throw new VError(format('Invalid container id: "%s"', pp(cid)));
    }

    // Find container.
    return findContainer(cid)
    // Throw an error if a container was not found.
    .tap(function(container) {
      if (!container) {
        throw new VError(format('The container "%s" does not exist!', pp(cid)));
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
        throw new VError('Invalid cid: ' + pp(cid));
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
      if (isRunning) {
        return Promise.fromNode(function(cb) {
          self.container.stop(cb);
        });
      }
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error stopping container %s.', cid);
    });

  };

  /*
   * Load images from a image archive
   */
  var load = function(file) {
    return Promise.fromNode(function(cb) {
      dockerInstance().call('loadImage', file, {}, cb);
    });
  };

  /*
   * Do a docker run
   * @todo: we can get rid of this once docker compose run
   * supports interactive mode on windows
   */
  var run = function(createOpts, opts) {

    // Get the mode
    var mode = (opts && opts.mode) ? opts.mode : 'collect';

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
        if (mode === 'attach') {
          attachOpts.stdin = true;
        }

        container.attach(attachOpts, cb);
      })

      .then(function(stream) {

        // Attaching mode
        if (mode === 'attach') {
          stream.pipe(process.stdout);
          process.stdin.resume();
          process.stdin.setEncoding('utf8');
          if (process.stdin.setRawMode) {
            process.stdin.setRawMode(true);
          }
          process.stdin.pipe(stream);
        }

        // Start the container
        return Promise.fromNode(function(cb) {
          container.start({}, cb);
        })

        // Wait until the stream is done
        .then(function() {

          // Promisify the spawn
          return new Promise(function(resolve, reject) {

            // Collector for buffer
            var stdOut = '';
            var stdErr = '';

            // Collect the buffer if in collect mode
            if (mode === 'collect') {
              stream.on('data', function(buffer) {
                stdOut = stdOut + String(buffer);
              });
            }

            // Collect the errorz
            stream.on('error', function(buffer) {
              stdErr = stdErr + String(buffer);
            });

            stream.on('end', function() {
              if (mode === 'attach') {
                if (process.stdin.setRawMode) {
                  process.stdin.setRawMode(false);
                }
                process.stdin.pause();
              }
              if (!_.isEmpty(stdErr)) {
                reject(stdErr);
              }
              else {
                resolve(stdOut);
              }
            });

          });

        })

        // Remove the container and pass the data
        .then(function(result) {
          return Promise.fromNode(function(cb) {
            container.remove({force: true, v: true}, cb);
          })
          .then(function() {
            return result;
          });
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

    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error removing container %s.', cid);
    });

  };

  /*
   * Returns a stream of docker events.
   */
  var events = function() {

    // Get docker instance.
    return dockerInstance()
    // Get stream of docker events.
    .then(function(dockerInstance) {
      return Promise.fromNode(function(cb) {
        // Include since option with a really old timestamp to ensure we get
        // all events since engine was started. This is useful when an app
        // was started with the cli, before the GUI was initialized.
        var opts = {
          since: 1300000000
        };
        dockerInstance.getEvents(opts, cb);
      });
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error listening to docker events.');
    });

  };

  return {
    events: events,
    findContainer: findContainer,
    findContainerThrows: findContainerThrows,
    inspect: inspect,
    isRunning: isRunning,
    list: list,
    remove: remove,
    run: run,
    stop: stop,
    load: load
  };

};
