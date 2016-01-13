'use strict';

/**
 * Kalabox lib -> engine -> docker module.
 * @module docker
 */

// Build module.
module.exports = function(kbox) {

  // Node
  var path = require('path');

  // Npm
  var _ = require('lodash');

  // Constants
  var PROVIDER_PATH = path.join(__dirname, 'provider', 'docker');

  // Get and load the provider config
  var providerConfigFile = path.resolve(PROVIDER_PATH, 'config.yml');
  var providerConfig = kbox.util.yaml.toJson(providerConfigFile);
  kbox.core.deps.register('providerConfig', providerConfig);

  // Kalabox Modules
  var Promise = kbox.Promise;
  var compose = require(path.join(PROVIDER_PATH, 'compose.js'))(kbox);
  var docker = require(path.join(PROVIDER_PATH, 'docker.js'))(kbox);

  /*
   * Load our engine things
   */
  var init = _.once(function() {

    var VError = require('verror');
    var path = require('path');

    /*
     * Helper function to load our engine things
     */
    var load = function(s) {
      try {
        return require(s)(kbox);
      } catch (err) {
        throw new VError(err, 'Error loading module "%s".', s);
      }
    };

    // Load our tasks
    load('./lib/tasks.js');

    // Get the provider we need and then load its install routinezzz
    var providerInstallerFile = path.join(PROVIDER_PATH, 'install.js');
    load(providerInstallerFile);

  });

  /*
   * We might have datum but we need to wrap in array so Promise.each knows
   * what to do
   */
  var normalizer = function(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }
    return data;
  };

  /*
   * Helper to return a valid id from app data
   */
  var getId = function(c) {
    return c.cid || c.id || c.containerName || c.containerID || c.name;
  };

  /*
   * Query docker for a list of containers.
   */
  var list = function(appName) {

    // Validate inputs.
    return Promise.try(function() {
      if (appName && typeof appName !== 'string') {
        throw new TypeError('Invalid appName: ' + appName);
      }
    })

    .then(function() {
      return docker.list(appName);
    });

  };

  /*
   * Inspect a container.
   */
  var inspect = function(datum) {

    if (getId(datum)) {
      return docker.inspect(getId(datum));
    }
    else if (datum.compose) {
      return compose.getId(datum.compose, datum.project, datum.opts)
      .then(function(id) {
        if (!_.isEmpty(id)) {
          return docker.inspect(_.trim(id));
        }
      });
    }

  };

  /*
   * Return true if the container is running otherwise false.
   */
  var isRunning = function(cid) {
    return docker.isRunning(cid);
  };

  /*
   * Start a container.
   */
  var start = function(data) {
    return Promise.each(normalizer(data), function(datum) {
      return compose.start(datum.compose, datum.project, datum.opts);
    });
  };

  /*
   * Check if container exists
   */
  var exists = function(datum) {

    if (getId(datum)) {
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
        // Search set of valid containers for data.
        return _.has(idSet, getId(datum));
      });
    }
    else if (datum.compose) {
      return compose.getId(datum.compose, datum.project, datum.opts)
      .then(function(id) {
        return !_.isEmpty(id);
      });
    }

  };

  /*
   * Do a docker exec into a container.
   */
  var getProvider = _.once(function() {
    return docker.getProvider();
  });

  /*
   * Create and run a command inside of a container.
   */
  var run = function(data) {
    return Promise.all(_.map(normalizer(data), function(datum) {
      return compose.run(datum.compose, datum.project, datum.opts);
    }));
  };

  /*
   * Stop a container.
   */
  var stop = function(data) {
    return Promise.each(normalizer(data), function(datum) {
      if (getId(datum)) {
        return docker.stop(getId(datum));
      }
      else if (datum.compose) {
        return compose.stop(datum.compose, datum.project, datum.opts);
      }
    });
  };

  /*
   * Remove a container.
   */
  var remove = function(data) {
    return Promise.each(normalizer(data), function(datum) {
      if (getId(datum)) {
        return docker.remove(getId(datum));
      }
      else if (datum.compose) {
        return compose.remove(datum.compose, datum.project, datum.opts);
      }
    });
  };

  /*
   * Builds and/or pulls a docker image
   */
  var build = function(data) {
    return Promise.each(normalizer(data), function(datum) {
      return compose.pull(datum.compose, datum.project, datum.opts);
    })
    .then(function() {
      return Promise.each(normalizer(data), function(datum) {
        return compose.build(datum.compose, datum.project, datum.opts);
      });
    });
  };

  return {
    build: build,
    exists: exists,
    getProvider: getProvider,
    init: init,
    inspect: inspect,
    isRunning: isRunning,
    list: list,
    destroy: remove,
    run: run,
    start: start,
    stop: stop
  };

};
