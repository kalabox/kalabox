'use strict';

/**
 * Kalabox lib -> engine -> docker module.
 * @module docker
 */

// Build module.
module.exports = function(kbox) {

  /*
   * Native modules.
   */
  var assert = require('assert');
  var format = require('util').format;
  var path = require('path');
  var pp = require('util').inspect;

  // Constants
  var PROVIDER_PATH = path.join(__dirname);

  /*
   * NPM modules.
   */
  var Dockerode = require('dockerode');
  var MemoryStream = require('memorystream');
  var VError = require('verror');
  var _ = require('lodash');

  // Kalabox Modules
  var Promise = kbox.Promise;

  // Create logging functions.
  var log = kbox.core.log.make('DOCKER');

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
   * Do a docker exec into a container.
   */
  var exec = function(cid, opts) {

    // Tty = use in terminal mode.

    /*
     * Terminal mode does not support demuxing streams into stdout and stderr.
     */

    // Default options.
    opts.tty = opts.tty || false;
    opts.cmd = opts.cmd || ['bash'];
    opts.collectStdout = opts.collectStdout || false;

    // Exec creation options.
    var createOpts = {
      AttachStdin: opts.tty, // Attach stdin if terminal mode.
      AttachStdout: true,
      AttachStderr: true,
      Tty: opts.tty, // Terminal mode.
      Cmd: opts.cmd, // Command to execute.
      stream: true // Needed for dockerode.
    };

    // Exec start options.
    var startOpts = {
      Detach: false, // Needs to be detached so process doesn't block.
      stdin: opts.tty, // Attach stdin if terminal mode.
      stdout: true,
      stderr: true
    };

    // Make sure container exists.
    return findContainerThrows(cid)
    // Create a container exec.
    .then(function(container) {
      return Promise.fromNode(function(cb) {
        log.debug('Creating exec.', createOpts);
        container.exec(createOpts, cb);
      })
      // Bind with an empty object.
      .bind({})
      // Start the exec.
      .then(function(exec) {
        // Store exec object in binding, so we can inspect it later.
        this.exec = exec;
        return Promise.fromNode(function(cb) {
          log.debug('Starting exec.', startOpts);
          exec.start(startOpts, cb);
        });
      })
      // Return result.
      .then(function(stream) {

        var self = this;

        var result = {};

        if (opts.tty) {

          // Just stdout to worry about.
          process.stdin.pipe(stream);
          result.stdout = stream;
          result.stdout.setEncoding('utf8');
          // Function to wait on.
          result.wait = function() {
            return new Promise.fromNode(function(cb) {
              stream.on('end', cb);
            });
          };

        } else {

          // Demux stream into stdout and stderr.
          result.stdout = new MemoryStream();
          result.stderr = new MemoryStream();
          result.stdout.setEncoding('utf8');
          result.stderr.setEncoding('utf8');
          container.modem.demuxStream(stream, result.stdout, result.stderr);
          // Function to wait on.
          result.wait = function() {
            // Start a new promise.
            return new Promise(function(fulfill, reject) {
              // Collect stdout in a buffer.
              var stdoutBuffer = opts.collectStdout ? '' : undefined;
              result.stdout.on('data', function(data) {
                if (opts.collectStdout) {
                  stdoutBuffer += data;
                }
              });
              // Collect stderr in a buffer.
              var stderrBuffer = opts.collectStdout ? '' : undefined;
              result.stderr.on('data', function(data) {
                if (opts.collectStdout) {
                  stderrBuffer += data;
                }
              });
              // When the stream ends we will check the results of our exec.
              stream.on('end', function() {
                // Inspect the exec.
                return Promise.fromNode(function(cb) {
                  self.exec.inspect(cb);
                })
                .then(function(data) {
                  if (data.Running) {
                    // This condition shouldn't happen.
                    reject(new Error('Exec is still running: unexpected!'));
                  } else if (data.ExitCode === 0) {
                    // Success!
                    if (stdoutBuffer.length === 0 && stderrBuffer.length > 0) {
                      // Empty stdout, but there is a non-empty stderr.
                      fulfill(stderrBuffer);
                    } else {
                      // Return stdout.
                      fulfill(stdoutBuffer);
                    }
                  } else {
                    // We have a non-zero exit code, grab stderr and report.
                    var msg = 'Non-zero exit code: ' + data.ExitCode;
                    if (stderrBuffer.length > 0) {
                      msg += ' ' + stderrBuffer;
                    }
                    reject(new Error(msg));
                  }
                });
              });
            });
          };

        }

        return result;

      });
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err,
        'Error while running command "%s" in container %s', opts.cmd, cid);
    });

  };

  /*
   * Open a terminal to a container.
   */
  var terminal = function(cid) {

    // Exec options.
    var opts = {
      cmd: ['/bin/bash'], // Terminal should run bash shell.
      tty: true // Terminal mode should be turned on so we get prompts.
    };

    // Create and start exec.
    return exec(cid, opts)
    .then(function(res) {
      // Pipe terminal's stdout to local stdout.
      res.stdout.pipe(process.stdout);
      // Wait for terminal session to end.
      return res.wait()
      // Do some cleanup.
      .then(function() {
        process.stdin.destroy();
      });
    });

  };

  /*
   * Run a query against a container.
   */
  var query = function(cid, cmd, opts) {

    // Exec options.
    opts = opts || {};
    opts.cmd = cmd;

    return exec(cid, opts);

  };

  /*
   * Run a query against a container, return data.
   */
  var queryData = function(cid, cmd) {

    // Query container.
    return query(cid, cmd, {collectStdout: true})
    .then(function(res) {
      // Wait for container to finish.
      return res.wait();
    });

  };

  /*
   * Create a container, do something, then make sure it gets stopped
   * and removed.
   *
   * THIS WILL NOT WORK IF YOU CHANGE THE DEFAULT ENTRYPOINT. MAKE SURE
   * IT IS SET TO ["/bin/sh", "-c"] IN YOUR CREATEOPTS BEFORE YOU CALL
   * THIS.
   *
   */
  var use = function(rawImage, createOpts, startOpts, fn) {

    // Expand image.
    var image = kbox.util.docker.imageName.expand(rawImage);

    // Argument processing.
    if (!fn && _.isFunction(startOpts)) {
      fn = startOpts;
      startOpts = {};
    }

    // Argument processing.
    if (!fn && _.isFunction(createOpts)) {
      fn = createOpts;
      createOpts = {};
    }

    // Get a temp container name.
    var name = kbox.util.docker.containerName.format(
      kbox.util.docker.containerName.createTemp()
    );

    // Extend options.
    var opts = {
      name: name,
      Cmd: ['bash'], // This makes sure container doesn't stop until removed.
      Tty: true,
      Image: image
    };
    _.extend(opts, createOpts);

    // Create container.
    return dockerInstance()
    .then(function(dockerInstance) {
      return Promise.fromNode(function(cb) {
        log.info(format('Creating ad hoc container "%s".', image), opts);
        dockerInstance.createContainer(opts, cb);
      });
    })
    // Bind container.
    .bind({})
    .then(function(container) {
      log.info('Ad hoc container created.', container.id);
      this.container = container;
    })
    // Start container.
    .then(function() {
      // Save for later.
      var self = this;
      log.info(
        format('Starting ad hoc container "%s".', self.container.id),
        startOpts
      );
      return Promise.fromNode(function(cb) {
        self.container.start(startOpts, cb);
      })
      .then(function() {
        log.info('Ad hoc container started.', self.container.id);
      });
    })
    // Run callback.
    .then(function() {
      return Promise.try(fn, this.container);
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error running ad hoc container with %s.', image);
    })
    // Cleanup.
    .finally(function() {
      // Save for later.
      var self = this;
      // Remove container.
      if (self.container) {
        log.info('Removing ad hoc container.', this.container.id);
        return Promise.fromNode(function(cb) {
          self.container.remove({force: true}, cb);
        });
      }
    });

  };

  /*
   * Create and run a command inside of a container.
   */
  var run = function(rawImage, cmd, createOpts, startOpts) {

    var image = kbox.util.docker.imageName.expand(rawImage);

    var defaultCreateOpts = {
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      Cmd: cmd,
      Image: image
    };

    createOpts = _.extend(defaultCreateOpts, createOpts);

    var attachOpts = {
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true
    };

    var removeOpts = {
      force: true
    };

    return dockerInstance()
    .then(function(dockerInstance) {
      log.debug('Creating RUN container.', createOpts);
      return Promise.fromNode(function(cb) {
        dockerInstance.createContainer(createOpts, cb);
      })
      .tap(function() {
        log.debug('Created RUN container.');
      });
    })
    .then(function(container) {
      log.debug('Attaching to RUN container.', attachOpts);
      return Promise.fromNode(function(cb) {
        container.attach(attachOpts, cb);
      })
      .tap(function() {
        log.debug('Attached to RUN container.')  ;
      })
      .then(function(stream) {
        stream.pipe(process.stdout);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        if (process.stdin.setRawMode) {
          process.stdin.setRawMode(true);
        }
        process.stdin.pipe(stream);
        stream.on('end', function() {
          if (process.stdin.setRawMode) {
            process.stdin.setRawMode(false);
          }
          process.stdin.pause();
        });
        return stream;
      })
      .then(function() {
        log.debug('Starting RUN container.', startOpts);
        return Promise.fromNode(function(cb) {
          container.start(startOpts, cb);
        })
        .tap(function() {
          log.debug('Started RUN container.');
        });
      })
      .then(function() {
        log.debug('Waiting on RUN container.');
        return Promise.fromNode(function(cb) {
          container.wait(cb);
        });
      })
      .finally(function() {
        log.debug('Removing RUN container.', removeOpts);
        return Promise.fromNode(function(cb) {
          container.remove(removeOpts, cb);
        })
        .tap(function() {
          log.debug('Removed RUN container.');
        });
      });
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
   * Remove a container.
   */
  var remove = function(cid, opts) {

    // Some option handling.
    opts = opts || {};
    opts.v = _.get(opts, 'v', true);
    opts.kill = _.get(opts, 'kill', false);

    // Log start.
    log.info(format('Removing container %s.', cid), opts);

    // Find a container or throw and error.
    return findContainerThrows(cid)
    .then(function(container) {
      // Stop the container if it's running.
      return isRunning(cid)
      .tap(function(isRunning) {
        if (isRunning) {
          log.info('Stopping container.', cid);
          return Promise.fromNode(container.stop);
        }
      })
      // Remove the container.
      .then(function() {
        return Promise.fromNode(function(cb) {
          container.remove(opts, cb);
        });
      })
      // Log success.
      .then(function() {
        log.info('Container removed.', cid);
      });
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error removing container %s.', cid);
    });

  };

  /*
   * Read the contents of the containers logs.
   */
  var logs = function(cid, opts) {

    opts = opts || {};
    opts.stdout = opts.stdout || true;
    opts.stderr = opts.stderr || false;

    return findContainerThrows(cid)
    .then(function(container) {
      return Promise.fromNode(function(cb) {
        container.logs(opts, cb);
      });
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error reading container logs: %s.', cid);
    });

  };

  return {
    exec: exec,
    findContainer: findContainer,
    findContainerThrows: findContainerThrows,
    getProvider: getProvider,
    inspect: inspect,
    isRunning: isRunning,
    list: list,
    logs: logs,
    query: query,
    queryData: queryData,
    remove: remove,
    run: run,
    stop: stop,
    terminal: terminal,
    use: use
  };

};
