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
  var path = require('path');

  // Constants
  var PROVIDER_PATH = path.join(__dirname, 'provider', 'docker');

  /*
   * NPM modules.
   */
  var _ = require('lodash');

  // Kalabox Modules
  var Promise = kbox.Promise;
  var compose = require(path.join(PROVIDER_PATH, 'compose.js'))(kbox);
  var docker = require(path.join(PROVIDER_PATH, 'docker.js'))(kbox);

  /*
   * Init.
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
   * Query docker for a list of containers.
   */
  var list = function(appName) {
    return docker.list(appName);
  };

  /*
   * Inspect a container.
   */
  var inspect = function(cid) {
    return docker.inspect(cid);
  };

  /*
   * Return true if the container is running otherwise false.
   */
  var isRunning = function(cid) {
    return docker.isRunning(cid);
  };

  /*
   * Return a generic container with extra info added.
   */
  var info = function(cid) {
    return docker.info(cid);
  };

  /*
   * Create containers
   */
  var create = function(data) {

    return Promise.each(normalizer(data), function(datum) {
      if (datum.name) {
        return docker.create(datum);
      }
      else if (datum.dirs) {
        return compose.create(datum.dirs, datum.opts);
      }
    });

  };

  /*
   * Start a container.
   */
  var start = function(cid, opts) {
    return docker.start(cid, opts);
  };

  /*
   * Do a docker exec into a container.
   */
  var exec = function(cid, opts) {
    return docker.exec(cid, opts);
  };

  /*
   * Do a docker exec into a container.
   */
  var findContainer = function(cid) {
    return docker.findContainer(cid);
  };

  /*
   * Do a docker exec into a container.
   */
  var findContainerThrows = function(cid) {
    return docker.findContainerThrows(cid);
  };

  /*
   * Do a docker exec into a container.
   */
  var getProvider = _.once(function() {
    return docker.getProvider();
  });

  /*
   * Open a terminal to a container.
   */
  var terminal = function(cid) {
    return docker.terminal(cid);
  };

  /*
   * Run a query against a container.
   */
  var query = function(cid, cmd, opts) {
    return docker.query(cid, cmd, opts);
  };

  /*
   * Run a query against a container, return data.
   */
  var queryData = function(cid, cmd) {
    return docker.queryData(cid, cmd);
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
    return docker.use(rawImage, createOpts, startOpts, fn);
  };

  /*
   * Create and run a command inside of a container.
   */
  var run = function(rawImage, cmd, createOpts, startOpts) {
    return docker.run(rawImage, cmd, createOpts, startOpts);
  };

  /*
   * Stop a container.
   */
  var stop = function(cid) {
    return docker.stop(cid);
  };

  /*
   * Remove a container.
   */
  var remove = function(cid, opts) {
    return docker.remove(cid, opts);
  };

  /*
   * Read the contents of the containers logs.
   */
  var logs = function(cid, opts) {
    return docker.logs(cid, opts);
  };

  /*
   * Delegate to either compose or docker
   */
  var build = function(data, opts) {

    return Promise.each(normalizer(data), function(datum) {
      if (datum.name) {
        return docker.build({name: datum.name});
      }
      else if (datum.dirs) {
        return compose.pull(datum.dirs, opts);
      }
    });

  };

  return {
    build: build,
    create: create,
    exec: exec,
    get: findContainer,
    getEnsure: findContainerThrows,
    getProvider: getProvider,
    info: info,
    init: init,
    inspect: inspect,
    isRunning: isRunning,
    list: list,
    logs: logs,
    query: query,
    queryData: queryData,
    remove: remove,
    run: run,
    start: start,
    stop: stop,
    terminal: terminal,
    use: use
  };

};
