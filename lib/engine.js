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
var art = require('./art.js');
var installer = require('./install.js');
var util = require('./util.js');
var helpers = util.helpers;

/*
 * Logging functions.
 */
var log = core.log.make('ENGINE');

/*
 * Engine instance.
 */
var engineInstance = _.once(function(callback) {

  // Load the engine plugin.
  return Promise.try(function() {

    // Log start.
    log.debug('Initializing engine.');

    // Get kbox module loading function.
    var kboxRequire = core.deps.get('kboxRequire');

    // Get name of the engine from config.
    var engineName = core.deps.get('globalConfig').engine;

    // Load the engine module.
    return kboxRequire(engineName);

  })
  // Log success.
  .tap(function() {
    log.debug('Engine initialized.');
  })
  // Return.
  .nodeify(callback);

});

/*
 * Provider instance.
 */
var providerInstance = exports.provider = _.once(function(callback) {

  return engineInstance()
  .then(function(engineInstance) {
    return engineInstance.getProvider()
    .tap(function(provider) {
      core.deps.register('providerModule', provider);
    });
  })
  .nodeify(callback);

});

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
    return providerInstance().call('isInstalled')
    // Update cache and throw error if provider isn't installed.
    .then(function(isInstalled) {
      isProviderInstalled = isInstalled;
      if (!isInstalled) {
        console.log(art.firstTime());
        return installer.run();
      }
    })

    // Return.
    .nodeify(callback);

  }

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
var up = exports.up = function(attempts, callback) {

  // Verify the provider is already installed.
  return verifyProviderInstalled()
  // Bring the provider up.
  .then(function() {
    return providerInstance().call('up', {maxRetries: 3});
  })
  // Return.
  .nodeify(callback);

};

/*
 * Singleton cached value for providers up status.
 */
var isProviderUp = false;

/*
 * Starts provider if not up.
 */
var verifyProviderUp = function(callback) {

  if (isProviderUp) {

    // All is good!
    return Promise.resolve()
    .nodeify(callback);

  } else {

    // Query for provider's up status.
    return providerInstance().call('isUp')
    // Update cache and turn on provider if needed
    .then(function(isUp) {
      isProviderUp = isUp;
      if (!isProviderUp) {
        // Try to turn it on!
        return up()
        // Turn promise resolution
        .then(function() {
          return Promise.resolve();
        });
      }
    })
    // Return.
    .nodeify(callback);

  }

};

/*
 * Init engine if it has not already been.
 */
var verifyEngineHasBeenInit = function(callback) {

  // Make sure instance has been init.
  return engineInstance()
  // Return.
  .nodeify(callback);

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
  return providerInstance().call('name');
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
  return providerInstance().call('isUp')
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

  return engineInstance().call('init')
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
  .then(function() {
    return providerInstance().call('down', {maxRetries: 3});
  })
  // Make sure to reset this flag.
  .tap(function() {
    isProviderUp = false;
  })
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
    return engineInstance().call('list', appName);
  })
  // Return.
  .nodeify(callback);

};

// @todo: @bcauldwell - Document this.
exports.isRunning = exports.isContainerRunning = function(cid, callback) {

  return verifyProviderIsReady()
  .then(function() {
    return engineInstance().call('isRunning', cid);
  })
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
  // Inspect the container.
  .then(function() {
    return engineInstance().call('inspect', cid);
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
    return engineInstance().call('info', cid);
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
    return engineInstance().call('create', opts);
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
    return engineInstance().call('start', cid, opts);
  })
  // Wait 3 seconds.
  // @todo: bcauldwell - This is to give the redis container a brief chance to
  // get into a good state. Would be better implemented by an async event.
  .delay(3 * 1000)
  // Return.
  .nodeify(callback);

};

/*
 * Create a container, do something, then make sure it gets stopped
 * and removed.
 */
var use = exports.use = function(image, createOpts, startOpts, fn, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Emit pre engine create event.
  .then(function() {
    // Add image to createOpts so our events have more info to work with
    createOpts.image = image;
    return core.events.emit('pre-engine-create', createOpts);
  })
  // Call use on engine.
  .then(function() {
    // Remove the image because we don't want to mess with with things
    delete createOpts.image;
    return engineInstance().call(
      'use',
      image,
      createOpts,
      startOpts,
      fn
    );
  })
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
var run = exports.run = function(image, cmd, createOpts, startOpts, callback) {

  // Add a newer function signature, while keeping existing backwardly
  // compatible function signature.
  if (typeof image === 'object' &&
    typeof cmd === 'object' &&
    (!createOpts || typeof createOpts === 'function') &&
    !startOpts &&
    !callback) {
    callback = createOpts;
    startOpts = cmd;
    createOpts = image;
    cmd = createOpts.Cmd;
    image = createOpts.Image;
  }

  // Emit pre engine create event.
  // Add image and command to create opts so we have more to work with in
  // the event
  createOpts.image = image;
  createOpts.cmd = cmd;

  // Make sure the provider is ready
  return verifyProviderIsReady()

  // Emit pre engine create
  .then(function() {
    return core.events.emit('pre-engine-create', createOpts);
  })

  // Run.
  .then(function() {
    // Remove previously added image and cmd so it doesnt mess with anything
    delete createOpts.image;
    delete createOpts.cmd;
    // Run the things
    return engineInstance().call('run', image, cmd, createOpts, startOpts);
  })
  // Return.
  .nodeify(callback);

};

/*
 * Run a query against a container.
 */
var query = exports.query = function(cid, cmd, callback) {

  // Verify provider is ready.
  return verifyProviderReady()
  // Query.
  .then(function() {
    return engineInstance().call('query', cid, cmd);
  })
  // Return.
  .nodeify(callback);

};

/*
 * Run a query against a container.
 */
var queryData = exports.queryData = function(cid, cmd, callback) {

  // Verify provider is ready.
  return verifyProviderReady()
  // Query for data.
  .then(function() {
    return engineInstance().call('queryData', cid, cmd);
  })
  // Return.
  .nodeify(callback);

};

/*
 * Terminal into a container.
 */
var terminal = exports.terminal = function(cid, callback) {

  // Verify provider is ready.
  return verifyProviderReady()
  // Terminal into container.
  .then(function() {
    return engineInstance().call('terminal', cid);
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
    return engineInstance().call('stop', cid);
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
    return engineInstance().call('remove', cid);
  })
  // Return.
  .nodeify(callback);

};

// @todo: @bcauldwell - Documents.
exports.logs = function(cid, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Query container's logs.
  .then(function() {
    return engineInstance().call('logs', cid);
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
    return engineInstance().call('build', image);
  })
  // Return.
  .nodeify(callback);

};
