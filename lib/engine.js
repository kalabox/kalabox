'use strict';

/**
 * Module for interfacing with the Kalabox container system implementation, and
 * the provider of the container system.
 *
 * NOTE: The container system and the provider are not always the same. For
 * example using docker on a Mac would use docker as the container system,
 * however it would be provided by boot2docker.
 * @module kbox.engine
 */

/*
 * NPM modules.
 */
var _ = require('lodash');

/*
 * Kbox modules.
 */
var Promise = require('./promise.js');
var core = require('./core.js');
var util = require('./util.js');
var helpers = util.helpers;

/*
 * Load the provider module.
 */
var loadProviderModule = function() {
  return require('./engine/provider.js');
};

/*
 * Singleton instance of provider.
 */
var providerInstance = exports.provider = loadProviderModule();

/*
 * Singleton instance of engine.
 */
var engineInstance = null;

/*
 * Return a detailed error wrapped in a promise.
 */
var makeProviderError = function(msg) {

  // Try to get the provider's name.
  return Promise.try(providerInstance.getName)
  // Can't get provider name so just return null.
  .catch(function(err) {
    return null;
  })
  // Throw an error.
  .then(function(providerName) {
    var fullMsg = [
      'Provider',
      providerName,
      msg
    ].join(' ');
    throw new Error(fullMsg);
  });

};

/*
 * Singleton cache for is provider installed boolean.
 */
var isProviderInstalled = false;

/*
 * Throws and error if the provider is not installed.
 */
var verifyProviderInstalled = function(callback) {

  if (isProviderInstalled) {

    // All is good.
    return Promise.resolve()
    .nodeify(callback);

  } else {

    // Query provider is installed value.
    return providerInstance.isInstalled()
    // Update cache and throw error if provider isn't installed.
    .then(function(isInstalled) {
      isProviderInstalled = isInstalled;
      if (!isInstalled) {
        return makeProviderError('is NOT installed!');
      }
    })
    // Return.
    .nodeify(callback);

  }

};

/*
 * Singleton cached value for providers up status.
 */
var isProviderUp = false;

/*
 * Throws an error if provider is not up.
 */
var verifyProviderUp = function(callback) {

  if (isProviderUp) {

    // All is good!
    return Promise.resolve()
    .nodeify(callback);

  } else {

    // Query for provider's up status.
    return providerInstance.isUp()
    // Update cache and throw error is provider is not up.
    .then(function(isUp) {
      isProviderUp = isUp;
      if (!isProviderUp) {
        return makeProviderError('is NOT up!');
      }
    })
    // Return.
    .nodeify(callback);

  }

};

/*
 * Singleton cache for engine's been init value.
 */
var engineHasBeenInit = false;

/*
 * Init engine if it has not already been.
 */
var verifyEngineHasBeenInit = function(callback) {

  if (engineHasBeenInit) {

    return Promise.resolve()
    .nodeify(callback);

  } else {

    // Get engine config from engine.
    return providerInstance.engineConfig()
    // Init engine and update cached flag.
    .then(function(config) {
      engineInstance.init(config);
      engineHasBeenInit = true;
    })
    // Return.
    .nodeify(callback);

  }

};

/*
 * Verify that the provider is ready.
 */
var verifyProviderIsReady = function(callback) {

  // Verify provider is installed.
  return verifyProviderInstalled()
  // Verify provider is up.
  .then(verifyProviderUp)
  // Verify engine has been init.
  .then(verifyEngineHasBeenInit)
  // Return.
  .nodeify(callback);

};

/**
 * Returns the name of the configured provider.
 * @returns {string} - Name of the configured provider.
 */
exports.getProviderName = function() {
  return providerInstance.name;
};

/**
 * Retrieves the state of the engine being up.
 * @arg {function} callback
 * @arg {error} callback.error
 * @arg {boolean} callback.isUp - Boolean representing the state of the engine being up.
 * @example
 * kbox.engine.isUp(function(err, isUp) {
 *   if (err) {
 *     throw err;
 *   } else if (isUp) {
 *     console.log('It is up!');
 *   }
 * });
 */
exports.isUp = function(callback) {

  // Query provider's is up value.
  return providerInstance.isUp()
  // Return.
  .nodeify(callback);

};

/**
 * Initializes kalabox engine.
 * @arg {string} globalConfig - Kalabox global config to initialize with.
 * @example
 * var globalConfig = kbox.core.config.getGlobalConfig();
 * kbox.engine.init(globalConfig);
 */
exports.init = function(globalConfig, callback) {

  // Start a promise.
  return Promise.try(function() {

    if (!engineInstance) {

      // Get kbox module loading function.
      var kboxRequire = core.deps.lookup('kboxRequire');

      // Get name of engine from config.
      var engineName = globalConfig.engine;

      // Load engine module.
      return kboxRequire(engineName)
      // Cache engine module and register provider module as a dependency.
      .then(function(mod) {
        engineInstance = Promise.promisifyAll(mod);
        var providerModule = engineInstance.getProviderModule();
        core.deps.register('providerModule', providerModule);
      });

    }

  })
  // Return.
  .nodeify(callback);

};

/**
 * Gets the engine provider into the state it needs to be in to do
 * engine things.
 * @arg {int} attempts - The amount of times to try to start the engine.
 * @arg {function} callback - Callback called when the engine has started.
 * @arg {error} callback.error
 * @example
 * kbox.engine.up(3, function(err) {
 *   if (err) {
 *     done(err);
 *   } else {
 *     var app = kbox.core.deps.lookup('app');
 *     kbox.app.rebuild(app, done);
 *   }
 * });
 */
exports.up = function(attempts, callback) {

  // Verify the provider is already installed.
  return verifyProviderInstalled()
  // Bring the provider up.
  // @todo: bcauldwell - Not sure why we stopped making multiple attempts to
  // up the provider, but we should think about doing it again.
  .then(providerInstance.up)
  // Return.
  .nodeify(callback);

};

/**
 * Turns the engine off.
 * @arg {int} attempts - The amount of times to try to stop the engine.
 * @arg {function} callback - Callback called when the engine has been stopped.
 * @arg {error} callback.error
 * @example
 * kbox.engine.down(PROVIDER_DOWN_ATTEMPTS, done);
 */
exports.down = function(attempts, callback) {

  // Verify the provider is already installed.
  return verifyProviderInstalled()
  // Bring the provider down.
  // @todo: bcauldwell - Not sure why we stopped making multiple attempts to
  // down the provider, but we should think about doing it again.
  .then(providerInstance.down)
  // Return.
  .nodeify(callback);

};

/**
 * Lists installed containers.
 * @static
 * @method
 * @arg {string} appName [optional] - App name to filter containers by.
 * @arg {function} callback - Callback called when the engine query completes.
 * @arg {error} callback.error
 * @arg {array} callback.containers - An array of container objects.
 * @example
 * kbox.engine.list(function(err, containers) {
 *   for (var i = 0; i < containers.length; ++i) {
 *     console.log(containers[i].name);
 *   }
 * });
 */
var list = exports.list = exports.listContainers = function(appName, callback) {

  // Do some argument processing.
  if (!callback && typeof appName === 'function') {
    callback = appName;
    appName = null;
  }

  // Validate inputs.
  return Promise.try(function() {
    if (appName && typeof appName !== 'string') {
      throw new TypeError('Invalid appName: ' + appName);
    }
  })
  // Verify provider is ready.
  .then(verifyProviderIsReady)
  // Get list of containers from engine.
  .then(function() {
    return engineInstance.listAsync(appName);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Returns whether a container exists or not.
 * @arg {string} cid - The container id.
 * @arg {function} callback - Callback..
 * @arg {error} callback.error
 * @arg {boolean} callback.exists - Whether the container exists or not
 * @example
 *  kbox.engine.exists(CONTAINER_NAME, function(err, exists) {
 *    if (err) {
 *      throw err;
 *    }
 *    else {
 *      console.log('I think, therefore i am.');
 *    }
 *  });
 */
exports.exists = exports.containerExists = function(cid, callback) {

  // Get list of containers.
  return list(null)
  .then(function(containers) {
    // Build set of all valid container ids.
    var idSet =
      _(containers)
      .chain()
      .map(function(container) {
        return [container.id, container.name];
      })
      .flatten()
      .uniq()
      .object()
      .value();
    // Search set of valid container ids for cid.
    return _.has(idSet, cid);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Inspects a container and returns details.
 * @arg {string} containerId - Id of the container to inspect.
 * @arg {function} callback - Callback called when the container has been inspected.
 * @arg {error} callback.error
 * @arg {object} callback.data - Object containing the containers inspected data.
 * @todo: do we want a docker specific thing in the interface?
 * @todo: this might already be deprecated?
 * @example
 * engine.inspect(dataContainer.name, function(err, data) {
 *  if (err) {
 *    return reject(err);
 *  }
 *  var codeDir = '/' + core.deps.lookup('globalConfig').codeDir;
 *  if (data.Volumes[codeDir]) {
 *    fulfill(data.Volumes[codeDir]);
 *  } else {
 *    fulfill(null);
 *  }
 * });
 */
exports.inspect = function(cid, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Get engine container with a given cid.
  .then(function() {
    return engineInstance.getEnsureAsync(cid, 'inspect');
  })
  // Inspect the container.
  .then(engineInstance.inspectAsync)
  // Return.
  .nodeify(callback);

};

/**
 * Inspects a container and returns details.
 * @arg {string} containerId - Id of the container to inspect.
 * @arg {function} callback - Callback called when the container has been inspected.
 * @arg {error} callback.error
 * @arg {object} callback.data - Object containing the containers inspected data.
 * @example
 * kbox.engine.info(container.id, function(err, info) {
 *   if (info.running) {
 *     kbox.engine.stop(container.id, function(err) {
 *       if (err) {
 *         done(err);
 *       }
 *       else {
 *         kbox.engine.remove(container.id, function(err) {
 *           if (err) {
 *             done(err);
 *           }
 *           else {
 *             done();
 *           }
 *         });
 *       }
 *     });
 *   }
 *   else {
 *     kbox.engine.remove(container.id, function(err) {
 *       if (err) {
 *         done(err);
 *       }
 *       else {
 *         done();
 *       }
 *     });
 *   }
 * });
 */
exports.info = function(cid, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Query engine for info on a container with a given container id.
  .then(function() {
    return engineInstance.infoAsync(cid);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Creates a container.
 * @arg {object} createOptions [optional] - Object containing the create options for the container.
 * @arg {function} callback - Callback called when the container has been created.
 * @arg {error} callback.error
 * @arg {object} callback.data - Object containing the created containers information.
 * @todo: find a good way to document createOptions, and possibly not make them docker specific.
 * @example
 * engine.create(component.installOptions, function(err, container) {
 *   if (err) {
 *    callback(err);
 *   } else {
 *     if (container) {
 *       component.containerId = container.cid;
 *       fs.writeFileSync(
 *         path.resolve(component.containerIdFile), container.cid
 *       );
 *    }
 *     events.emit('post-install-component', component, function(err) {
 *       callback(err);
 *     });
 *   }
 * });
 */
exports.create = function(opts, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Emit pre engine create event.
  .then(function() {
    return core.events.emit('pre-engine-create', opts);
  })
  // Create container.
  .then(function() {
    return engineInstance.createAsync(opts);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Starts a container.
 * @arg {string} containerId - Id of the container to start.
 * @arg {object} startOptions [optional] - Object containing the start options for the container.
 * @arg {function} callback - Callback called when the container has been started.
 * @arg {error} callback.error
 * @todo Find a good way to document startOptions, and possibly not make them docker specific.
 * @example
 * engine.start(component.containerId, component.opts, function(err) {
 *   if (err) {
 *     callback(err);
 *   } else {
 *     events.emit('post-start-component', component, function(err) {
 *       if (err) {
 *         callback(err);
 *       } else {
 *         callback(err);
 *       }
 *     });
 *   }
 * });
 */
exports.start = function(cid, opts, callback) {

  // Argument processing.
  if (typeof opts === 'function' && callback === undefined) {
    callback = opts;
    opts = null;
  }

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Start container.
  .then(function() {
    return engineInstance.startAsync(cid, opts);
  })
  // Wait 3 seconds.
  // @todo: bcauldwell - This is to give the redis container a brief chance to
  // get into a good state. Would be better implemented by an async event.
  .delay(3 * 1000)
  // Return.
  .nodeify(callback);

};

/**
 * Runs a command in a container, in interactive mode
 * @arg {string} image - Name of image to run command in
 * @arg {string} cmd - Command to run
 * @arg {object} startOptions [optional] - Object containing the start options for the container.
 * @arg {object} createOptions [optional] - Object containing the create options for the container.
 * @arg {function} callback - Callback called when the container has been started.
 * @arg {error} callback.error
 * @example
 * var image = 'kalabox/git:stable';
 * var cmd = ['git', 'status'];
 * kbox.engine.run(image, cmd, {}, {}, function(err) {
 *   if (err) {
 *     throw err;
 *   }
 *   done();
 * });
 */
exports.run = function(image, cmd, createOpts, startOpts, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Emit pre engine create event.
  .then(function() {
    return core.events.emit('pre-engine-create', createOpts);
  })
  // Run container.
  .then(function() {
    return engineInstance.runAsync(
      image,
      cmd,
      process.stdin,
      process.stdout,
      createOpts,
      startOpts
    );
  })
  // Return.
  .nodeify(callback);

};

// @todo: WTF is this?
var once = function(image, cmd, createOptions, startOptions, callback, done) {
  verifyProviderIsReady(function(err) {
    if (err) {
      done(err);
    }
    else {
      core.deps.call(function(events) {
        events.emit('pre-engine-create', createOptions, function(err) {
          if (err) {
            callback(err);
          }
          else {
            engineInstance.once(
              image,
              cmd,
              createOptions,
              startOptions,
              callback,
              done
            );
          }
        });
      });
    }
  });
};
exports.once = once;

/**
 * Queries a container and returns a stream
 * @static
 * @method
 * @arg {string} containerId - ID of container to run query against.
 * @arg {array} cmd - Command (query) to run in the form of an array of string.
 * @arg {function} callback - Callback called when the container has been started.
 * @arg {error} callback.error
 * @arg {stream} stream
 * @example
 * var image = 'kalabox/syncthing:stable';
 * var cmd = ['ls', '-l'];
 * kbox.engine.queryData(container, cmd, function(err, stream) {
 *   if (err) {
 *     throw err;
 *   } else {
 *     stream.on('data', function(buffer) {
 *       console.log(buffer.toString());
 *     });
 *     stream.on('error', function(err) {
 *       throw err;
 *     });
 *   }
 * });
 */
var query = exports.query = function(cid, cmd, stdout, stderr, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Query the container.
  .then(function() {
    return engineInstance.exec2Async(
      cid,
      cmd,
      stdout,
      stderr
    );
  })
  // Return.
  .nodeify(callback);

};

var consumeStream = function(stream, callback) {

  // Start a new promise.
  return new Promise(function(fulfill, reject) {

    // Init a new buffer.
    var buffer = null;

    // Handle on data event.
    stream.on('data', function(data) {
      if (!buffer) {
        buffer = new Buffer(data);
      } else {
        buffer = Buffer.concat([buffer, data]);
      }
    });

    // Handle on error event.
    stream.on('error', reject);

    // Handle on end event.
    stream.on('end', function() {
      var data = null;
      if (buffer) {
        data = buffer.toString();
      }
      fulfill(data);
    });

  })
  // Return.
  .nodeify(callback);

};

/**
 * Queries a container and returns a string
 * @static
 * @method
 * @arg {string} containerId - ID of container to run query against.
 * @arg {array} cmd - Command (query) to run in the form of an array of string.
 * @arg {function} callback - Callback called when the container has been started.
 * @arg {error} callback.error
 * @arg {string} data
 * @example
 * var image = 'kalabox/syncthing:stable';
 * var cmd = ['ls', '-l'];
 * kbox.engine.queryData(container, cmd, function(err, data) {
 *   if (err) {
 *     throw err;
 *   } else {
 *     console.log(data);
 *   }
 * });
 */
var queryData = exports.queryData = function(cid, cmd, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Exec container.
  .then(function() {
    return engineInstance.execAsync(cid, cmd);
  })
  // Consume stream.
  .then(function(stream) {
    return consumeStream(stream);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Stops a container.
 * @arg {string} containerId - Id of the container to stop.
 * @arg {function} callback - Callback called when the container has been stopped.
 * @arg {error} callback.error
 * @example
 * kbox.engine.stop(containerId, function(err) {
 *   if (err) {
 *     throw err;
 *   }
 *   console.log('Container stopped!');
 * });
 */
exports.stop = function(cid, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Stop container.
  .then(function() {
    return engineInstance.stopAsync(cid);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Removes a container from the engine.
 * @arg {string} containerId - Id of the container to remove.
 * @arg {function} callback - Callback called when the container has been removed.
 * @arg {error} callback.error
 * @example
 *  kbox.engine.remove(containerId, function() {
 *   fs.unlinkSync(containerIdFile);
 *   console.log('Removing the codez.');
 *   rmdir(app.config.codeRoot, function(err) {
 *     if (err) {
 *       done(err);
 *     }
 *     else {
 *       done();
 *     }
 *   });
 * });
 */
exports.remove = function(cid, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Remove container.
  .then(function() {
    return engineInstance.removeAsync(cid);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Pulls or builds the image for a container.
 * @arg {object} image - Image object to pull or build.
 * @arg {function} callback - Callback called when the image has been built.
 * @arg {error} callback.error
 * @example
 * kbox.engine.build({name: 'kalabox/syncthing:stable'}, function(err) {
 *   if (err) {
 *     state.status = false;
 *     done(err);
 *   } else {
 *     done();
 *   }
 * });
 *
 * kbox.engine.build({name: 'kalabox/syncthing'}, function(err) {
 *   if (err) {
 *     state.status = false;
 *     done(err);
 *   } else {
 *     done();
 *   }
 * });
 *
 * kbox.engine.build({name: 'syncthing'}, function(err) {
 *   if (err) {
 *     state.status = false;
 *     done(err);
 *   } else {
 *     done();
 *   }
 * });
 */
exports.build = function(image, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Build image.
  .then(function() {
    return engineInstance.buildAsync(image);
  })
  // Return.
  .nodeify(callback);

};
