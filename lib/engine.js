/**
 * Module for interfacing with the Kalabox container system implementation, and
 * the provider of the container system.
 *
 * @name engine
 */

'use strict';

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

/*
 * Engine instance.
 */
var engineInstance = _.once(function(callback) {

  // Load the engine plugin.
  return Promise.try(function() {

    // Get kbox module loading function.
    var kboxRequire = core.deps.get('kboxRequire');

    // Get name of the engine from config.
    var engineName = core.deps.get('globalConfig').engine;

    // Load the engine module.
    return kboxRequire(engineName);

  })

  // Return.
  .nodeify(callback);

});

/*
 * Provider instance.
 */
var providerInstance = exports.provider = function(callback) {

  return engineInstance()
  .then(function(engineInstance) {
    return engineInstance.getProvider()
    .tap(function(provider) {

      // Get the engine config
      return provider.engineConfig()

      // Set the engine config
      .then(function(engineConfig) {
        core.deps.remove('engineConfig');
        core.deps.register('engineConfig', engineConfig);
        return engineConfig.host;
      })

      // Set engine IP
      .tap(function(ip) {
        core.env.setEnv('KALABOX_ENGINE_IP', ip);
      })

      // Set engine remote IP
      .tap(function(ip) {
        // @todo: have a remote ip method on the provider?
        var remoteIp = (process.platform === 'linux') ? ip : '10.13.37.1';
        core.env.setEnv('KALABOX_ENGINE_REMOTE_IP', remoteIp);
      })

      // Set engine home dir
      .then(function() {
        var home = core.deps.get('globalConfig').home;
        core.env.setEnv('KALABOX_ENGINE_HOME', provider.path2Bind4U(home));
      });

    });
  })
  .nodeify(callback);

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
        console.log(art.needsInstall());
      }
    })

    // Return.
    .nodeify(callback);

  }

};

/**
 * Gets the engine provider into the state it needs to be in to do
 * engine things.
 * @memberof engine
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
  // Emit pre engine up event.
  .then(function() {
    return core.events.emit('pre-engine-up');
  })
  // Bring the provider up.
  .then(function() {
    return providerInstance().call('up', {maxRetries: 3});
  })
  // Emit post engine create event.
  .then(function() {
    return core.events.emit('post-engine-up');
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
 * @arg {function} callback - Callback called when the engine has been stopped.
 * @arg {error} callback.error
 * @example
 * kbox.engine.down(PROVIDER_DOWN_ATTEMPTS, done);
 */
exports.down = function(callback) {

  // Verify the provider is already installed.
  return verifyProviderInstalled()
  // Emit pre engine down event.
  .then(function() {
    return core.events.emit('pre-engine-down');
  })
  // Bring the provider down.
  .then(function() {
    return providerInstance().call('down', {maxRetries: 3});
  })
  // Make sure to reset this flag.
  .tap(function() {
    isProviderUp = false;
  })
  .then(function() {
    return core.events.emit('post-engine-down');
  })
  // Return.
  .nodeify(callback);

};

/**
 * Tells you if a container is running.
 * @static
 * @method
 * @arg {string} data [optional] - Data to filter containers by.
 * @arg {function} callback - Callback called when the engine query completes.
 * @arg {error} callback.error
 * @arg {boolean} callback.response - Engine query response.
 * @example
 * kbox.engine.list(function(err, containers) {
 *   for (var i = 0; i < containers.length; ++i) {
 *     console.log(containers[i].name);
 *   }
 * });
 */
exports.isRunning = function(data, callback) {

  return verifyProviderIsReady()
  .then(function() {
    return engineInstance().call('isRunning', data);
  })
  .nodeify(callback);

};

/**
 * Lists installed containers.
 * @static
 * @method
 * @arg {string} data [optional] - Data to filter containers by.
 * @arg {function} callback - Callback called when the engine query completes.
 * @arg {error} callback.error
 * @arg {Array} callback.containers - An array of container objects.
 * @example
 * kbox.engine.list(function(err, containers) {
 *   for (var i = 0; i < containers.length; ++i) {
 *     console.log(containers[i].name);
 *   }
 * });
 */
exports.list = function(data, callback) {

  // Do some argument processing.
  if (!callback && typeof data === 'function') {
    callback = data;
    data = null;
  }

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Get list of containers from engine.
  .then(function() {
    return engineInstance().call('list', data);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Returns whether a container exists or not.
 * @arg {string} data - Data to identify the container.
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
exports.exists = function(data, callback) {

  return verifyProviderIsReady()
  .then(function() {
    return engineInstance().call('exists', data);
  })
  .nodeify(callback);

};

/**
 * Inspects a container and returns details.
 * @arg {string} data - Data to id the container to inspect.
 * @arg {function} callback - Callback called when the container has been inspected.
 * @arg {error} callback.error
 * @arg {Object} callback.data - Object containing the containers inspected data.
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
exports.inspect = function(data, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Inspect the container.
  .then(function() {
    return engineInstance().call('inspect', data);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Starts a container.
 * @arg {string} data - Data about the container(s) to start.
 * @arg {function} callback - Callback called when the container has been started.
 * @arg {error} callback.error
 * @todo Find a good way to document startOptions, and possibly not make them docker specific.
 * @example
 * engine.start(component.containerId, function(err) {
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
exports.start = function(data, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Emit pre engine start event.
  .then(function() {
    return core.events.emit('pre-engine-start', data);
  })
  // Start container.
  .then(function() {
    return engineInstance().call('start', data);
  })
  // Emit post engine start event.
  .then(function() {
    return core.events.emit('post-engine-start', data);
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
 * @arg {string} data - Data about the container to run.
 * @arg {function} callback - Callback called when the container has been started.
 * @arg {error} callback.error
 * @example
 * var image = 'kalabox/git:stable';
 * var cmd = ['git', 'status'];
 * kbox.engine.run({image: image, cmd: cmd, startOpts: {}, createOpts: {}, function(err) {
 *   if (err) {
 *     throw err;
 *   }
 *   done();
 * });
 */
exports.run = function(data, callback) {

  // Make sure the provider is ready
  return verifyProviderIsReady()

  // Emit pre engine run
  .then(function() {
    return core.events.emit('pre-engine-run', data);
  })
  // Run.
  .then(function() {
    return engineInstance().call('run', data);
  })
  // Emit post engine rum
  .tap(function(/*response*/) {
    return core.events.emit('post-engine-run', data);
  })
  // Return our response
  .tap(function(response) {
    return response;
  })
  // Return.
  .nodeify(callback);

};

/**
 * Stops a container.
 * @arg {string} data - Data to ID the container(s) to stop.
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
exports.stop = function(data, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Emit pre engine stop event.
  .then(function() {
    return core.events.emit('pre-engine-stop', data);
  })
  // Stop container.
  .then(function() {
    return engineInstance().call('stop', data);
  })
  // Emit post engine start event.
  .then(function() {
    return core.events.emit('pre-engine-stop', data);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Removes a container from the engine.
 * @arg {string} data - Data to ID the container(s) to remove.
 * @arg {function} callback - Callback called when the container(s) has been removed.
 * @arg {error} callback.error
 * @example
 *  kbox.engine.destroy(containerId, function() {
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
exports.destroy = function(data, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Emit pre engine remote event.
  .then(function() {
    return core.events.emit('pre-engine-destroy', data);
  })
  // Remove container.
  .then(function() {
    return engineInstance().call('destroy', data);
  })
  // Emit post engine remove event.
  .then(function() {
    return core.events.emit('post-engine-destroy', data);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Pulls or builds images.
 * @arg {Object} data - Data about what to build. @todo: define data better
 * @arg {function} callback - Callback called when the data has been built.
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
 * return kbox.engine.build({id: '342', name: 'syncthing'})
 *
 * .then(function() {
 *   // Do stuff
 * })
 *
 * kbox.engine.build({id: 'syncthing', compose: composeDirs}, function(err) {
 *   if (err) {
 *     state.status = false;
 *     done(err);
 *   } else {
 *     done();
 *   }
 * });
 *
 */
exports.build = function(data, callback) {

  // Verify provider is ready.
  return verifyProviderIsReady()
  // Emit pre engine build event.
  .then(function() {
    return core.events.emit('pre-engine-build', data);
  })
  // Build image.
  .then(function() {
    return engineInstance().call('build', data);
  })
  // Emit post engine build event.
  .then(function() {
    return core.events.emit('pre-engine-build', data);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Returns a stream of docker events.
 * @arg {function} callback - Callback called when the data has been built.
 * @arg {error} callback.error
 * @example
 * kbox.engine.events()
 * .then(function(stream) {
 *   stream.on('data', function(data) {
 *     console.log(dat);
 *   });
 * });
 *
 */
exports.events = function(callback) {
  return verifyProviderIsReady()
  .then(function() {
    return engineInstance().call('events');
  })
  .nodeify(callback);
};
