/**
 * Module for interfacing with the Kalabox container system implementation, and
 * the provider of the container system.
 *
 * NOTE: The container system and the provider are not always the same. For
 * example using docker on a Mac would use docker as the container system,
 * however it would be provided by boot2docker.
 * @module kbox.engine
 */

'use strict';

var core = require('./core.js');
var util = require('./util.js');
var helpers = util.helpers;
var _ = require('lodash');

var provider = require('./engine/provider.js');
exports.provider = provider;

var engine = null;

var makeProviderError = function(msg) {
  var providerName = null;
  if (provider) {
    providerName = provider.getName();
  }
  var msgParts = [
    'Provider',
    providerName,
    msg
  ];
  var fullErrorMsg = _.filter(msgParts).join(' ');
  return new Error(fullErrorMsg);
};

var isProviderInstalled = false;
var verifyProviderInstalled = function(callback) {
  if (isProviderInstalled) {
    callback(null);
  } else {
    provider.isInstalled(function(err, isInstalled) {
      if (err) {
        callback(err);
      } else if (!isInstalled) {
        callback(makeProviderError('is NOT installed!'));
      } else {
        isProviderInstalled = true;
        callback(null);
      }
    });
  }
};

var isProviderUp = false;
var verifyProviderUp = function(callback) {
  if (isProviderUp) {
    callback(null);
  } else {
    provider.isUp(function(err, isUp) {
      if (err) {
        callback(err);
      } else if (!isUp) {
        callback(makeProviderError('is NOT up!'));
      } else {
        isProviderUp = true;
        callback(null);
      }
    });
  }
};

var engineHasBeenInit = false;
var verifyProviderIsReady = function(callback) {
  verifyProviderInstalled(function(err) {
    if (err) {
      callback(err);
    } else {
      verifyProviderUp(function(err) {
        if (err) {
          callback(err);
        } else {
          if (!engineHasBeenInit) {
            provider.engineConfig(function(err, config) {
              if (err) {
                callback(err);
              }
              else {
                engine.init(config);
                engineHasBeenInit = true;
                callback();
              }
            });
          }
          else {
            callback(null);
          }
        }
      });
    }
  });
};

/**
 * Returns the name of the configured provider.
 * @returns {string} - Name of the configured provider.
 */
exports.getProviderName = function() {
  return provider.name;
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
  provider.isUp(callback);
};

/**
 * Initializes kalabox engine.
 * @arg {string} globalConfig - Kalabox global config to initialize with.
 * @example
 * var globalConfig = kbox.core.config.getGlobalConfig();
 * kbox.engine.init(globalConfig);
 */
exports.init = function(globalConfig, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Invalid callback function.');
  }

  if (!engine) {
    var engineName = globalConfig.engine;
    core.deps.call(function(kboxRequire) {
      kboxRequire(engineName, function(err, result) {
        if (err) {
          callback(err);
        } else {
          engine = result;
          core.deps.register('providerModule', engine.getProviderModule());
          callback();
        }
      });
    });
  } else {
    callback();
  }
};

/**
 * Gets the engine provider into the state it needs to be in to do
 * engine things.
 * @arg {int} attempts - The amount of times to try to start the engine.
 * @arg {function} callback - Callback called when the engine has started.
 * @arg {error} callback.error
 */
exports.up = function(attempts, callback) {
  verifyProviderInstalled(function(err) {
    if (err) {
      callback(err);
    } else {
      //provider.up(attempts, callback);
      provider.up(callback);
    }
  });
};

/**
 * Turns the engine off.
 * @arg {int} attempts - The amount of times to try to stop the engine.
 * @arg {function} callback - Callback called when the engine has been stopped.
 * @arg {error} callback.error
 */
exports.down = function(attempts, callback) {
  verifyProviderInstalled(function(err) {
    if (err) {
      callback(err);
    } else {
      //provider.down(attempts, callback);
      provider.down(callback);
    }
  });
};

/**
 * Lists installed containers.
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
var list = exports.list = function(appName, callback) {
  if (callback === undefined && typeof appName === 'function') {
    callback = appName;
    appName = null;
  }
  if (appName && typeof appName !== 'string') {
    throw new TypeError('Invalid appName: ' + appName);
  }
  if (typeof callback !== 'function') {
    throw new TypeError('Invalid callback function: ' + callback);
  }

  verifyProviderIsReady(function(err) {
    if (err) {
      callback(err);
    } else {
      engine.list(appName, callback);
    }
  });
};

// @todo: document...
exports.exists = function(cid, callback) {
  list(function(err, containers) {
    if (err) {
      callback(err);
    } else {
      var exists = _.find(containers, function(container) {
        return container.id === cid || container.name === cid;
      });
      callback(null, exists !== undefined);
    }
  });
};

/**
 * Inspects a container and returns details.
 * @arg {string} containerId - Id of the container to inspect.
 * @arg {function} callback - Callback called when the container has been inspected.
 * @arg {error} callback.error
 * @arg {object} callback.data - Object containing the containers inspected data.
 */
exports.inspect = function(cid, callback) {
  verifyProviderIsReady(function(err) {
    if (err) {
      callback(err);
    } else {
      engine.getEnsure(cid, 'inspect', function(err, container) {
        if (err) {
          callback(err);
        } else {
          engine.inspect(container, callback);
        }
      });
    }
  });
};

// @todo: document
exports.info = function(cid, callback) {
  verifyProviderIsReady(function(err) {
    if (err) {
      callback(err);
    } else {
      engine.info(cid, callback);
    }
  });
};

/**
 * Creates a container.
 * @arg {object} createOptions [optional] - Object containing the create options for the container.
 * @arg {function} callback - Callback called when the container has been created.
 * @arg {error} callback.error
 * @arg {object} callback.data - Object containing the created containers information.
 */
// @todo: find a good way to document createOptions, and possibly not make them docker specific.
exports.create = function(createOptions, callback) {
  verifyProviderIsReady(function(err) {
    if (err) {
      callback(err);
    } else {
      engine.create(createOptions, callback);
    }
  });
};

/**
 * Starts a container.
 * @arg {string} containerId - Id of the container to start.
 * @arg {object} startOptions [optional] - Object containing the start options for the container.
 * @arg {function} callback - Callback called when the container has been started.
 * @arg {error} callback.error
 * @todo Find a good way to document startOptions, and possibly not make them docker specific.
 */
exports.start = function(cid, startOptions, callback) {
  if (typeof startOptions === 'function' && callback === undefined) {
    callback = startOptions;
    startOptions = null;
  }
  verifyProviderIsReady(function(err) {
    if (err) {
      callback(err);
    } else {
      engine.start(cid, startOptions, function(err) {
        // @todo: This short delay is to give redis a chance to get into a good state.
        // A better check would be bounded polling of redis until it is in a good state.
        setTimeout(function() {
          callback(err);
        }, 3000);
      });
    }
  });
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
  verifyProviderIsReady(function(err) {
    if (err) {
      callback(err);
    } else {
      engine.run(image, cmd, process.stdin, process.stdout,
        createOpts, startOpts, callback);
    }
  });
};

// @todo: document
var once = function(image, cmd, crtOpts, strOpts, callback, done) {
  verifyProviderIsReady(function(err) {
    if (err) {
      done(err);
    } else {
      engine.once(image, cmd, crtOpts, strOpts, callback, done);
    }
  });
};
exports.once = once;

/**
 * Queries a container and returns a stream
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
var query = exports.query = function(cid, cmd, callback) {
  engine.exec(cid, cmd, callback);
};

var consumeStream = function(stream, callback) {
  var buffer = null;
  stream.on('data', function(data) {
    if (!buffer) {
      buffer = new Buffer(data);
    } else {
      buffer = Buffer.concat([buffer, data]);
    }
  });
  stream.on('error', function(err) {
    callback(err);
  });
  stream.on('end', function() {
    if (!buffer) {
      callback(null, '');
    } else {
      callback(null, buffer.toString());
    }
  });
};

/**
 * Queries a container and returns a string
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
  engine.exec(cid, cmd, function(err, stream) {
    if (err) {
      callback(err);
    } else {
      consumeStream(stream, function(err, data) {
        callback(err, data);
      });
    }
  });
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
  verifyProviderIsReady(function(err) {
    if (err) {
      callback(err);
    } else {
      engine.stop(cid, callback);
    }
  });
};

/**
 * Removes a container from the engine.
 * @arg {string} containerId - Id of the container to remove.
 * @arg {function} callback - Callback called when the container has been removed.
 * @arg {error} callback.error
 */
exports.remove = function(cid, callback) {
  verifyProviderIsReady(function(err) {
    if (err) {
      callback(err);
    } else {
      engine.remove(cid, callback);
    }
  });
};

/**
 * Pulls or builds the image for a container.
 * @arg {object} image - Image object to pull or build.
 * @arg {function} callback - Callback called when the image has been built.
 * @arg {error} callback.error
 */
exports.build = function(image, callback) {
  verifyProviderIsReady(function(err) {
    if (err) {
      callback(err);
    } else {
      var fn = (image.build) ? 'build' : 'pull';
      engine[fn](image, callback);
    }
  });
};
