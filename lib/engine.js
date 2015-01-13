/**
 * Kalabox engine (docker) module.
 * @module engine
 */

'use strict';

var core = require('./core.js');
var docker = require('./engine/docker.js');
var Dockerode = require('dockerode');
var provider = require('./engine/provider.js');
//@todo: remove this eventually as well
exports.provider = provider;

//@todo: remove
var container = require('./engine/container.js');
exports.container = container;

// @todo: remove
var image = require('./engine/image.js');
exports.image = image;

var state = {
  docker: null,
  dockerConfig: null,
};

// @todo: Remove in favor of using the init function.
exports.getState = function() {
  return state;
};

/**
 * Initializes kalabox engine.
 * @arg {string} configFile - Kalabox config file to initialize with.
 * @example
 * var globalConfig = kbox.core.config.getGlobalConfig();
 * kbox.engine.init(globalConfig);
 */
exports.init = function(globalConfig) {
  core.env.ifElseLinux(
    function() {
      state.dockerConfig = globalConfig.dockerConfigLinux;
    },
    function() {
      state.dockerConfig = globalConfig.dockerConfig;
    }
  );
  state.docker = new Dockerode(state.dockerConfig);
  docker.init(state.docker);
};

/**
 * Gets the engine provider into the state it needs to be in to do
 * engine things.
 * @arg {int} attempts - The amount of times to try to start the engine.
 * @arg {function} callback - callback(err) - Callback called when the engine has started
 */
exports.up = function(attempts, callback) {
  provider.up(attempts, callback);
};

/**
 * Turns the engine off.
 * @arg {int} attempts - The amount of times to try to stop the engine.
 * @arg {function} callback - callback(err) - Callback called when the engine has started
 */
exports.down = function(attempts, callback) {
  provider.down(attempts, callback);
};

/**
 * Lists installed containers.
 * @arg {string} appName [optional] - App name to filter containers by.
 * @arg {function} callback - callback(err, containers) - A callback called when engine query completes.
 * @example
 * kbox.engine.list(function(err, containers) {
 *   for (var i = 0; i < containers.length; ++i) {
 *     console.log(containers[i].name);
 *   }
 * });
 */
exports.list = function(appName, callback) {
  docker.list(appName, callback);
};

/**
 * Inspects a container and returns details.
 * @arg {string} containerId - Id of the container to inspect.
 * @arg {function} callback - callback(err, data) - Callback called when the container has been inspected.
 */
exports.inspect = function(cid, callback) {
  var container = docker.get(cid);
  docker.inspect(container, callback);
};

/**
 * Creates a container.
 * @arg {object} startOptions [optional] - Object containing the create options for the container.
 * @arg {function} callback - callback(err, data) - Callback called when the container has been created.
 */
// @todo: find a good way to document createOptions, and possibly not make them docker specific.
exports.create = function(createOptions, callback) {
  docker.create(createOptions, callback);
};

/**
 * Starts a container.
 * @arg {string} containerId - Id of the container to start.
 * @arg {object} startOptions [optional] - Object containing the start options for the container.
 * @arg {function} callback - callback(err, data) - Callback called when the container has been started.
 */
// @todo: find a good way to document startOptions, and possibly not make them docker specific.
exports.start = function(cid, startOptions, callback) {
  if (typeof startOptions === 'function' && callback === undefined) {
    callback = startOptions;
    startOptions = null;
  }
  docker.start(cid, startOptions, callback);
};

/**
 * Stops a container.
 * @arg {string} containerId - Id of the container to stop.
 * @arg {function} callback - callback(err, data) - A callback called when the container has been stopped.
 * @example
 * kbox.engine.stop(containerId, function(err, data) {
 *   if (err) {
 *     throw err;
 *   }
 *   console.log('Container stopped!');
 * });
 */
exports.stop = function(cid, callback) {
  docker.stop(cid, callback);
};

/**
 * Removes a container from the engine.
 * @arg {string} containerId - Id of the container to remove.
 * @arg {function} callback - callback(err, data) - A callback called when the container has been removed.
 */
exports.remove = function(cid, callback) {
  docker.remove(cid, callback);
};

/**
 * Builds the images for a container.
 * @arg {object|array} image - Image object to build or an array of image objects.
 * @arg {function} callback - callback(err, data) - Callback called when the image has been built.
 */
exports.build = function(images, callback) {
  // @todo: we need to add a buildMany option here.
  var many = (Array.isArray(images)) ? 'Many' : '';
  var fn = (images.build) ? 'build' : 'pull';
  docker[fn + many](images, callback);
};
