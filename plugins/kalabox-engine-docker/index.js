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

  // Get and load the provider config
  var providerConfigFile = path.resolve(PROVIDER_PATH, 'config.yml');
  var providerConfig = kbox.util.yaml.toJson(providerConfigFile);
  kbox.core.deps.register('providerConfig', providerConfig);

  // Set some useful envars
  kbox.core.env.setEnv('KALABOX_ENGINE_IP', providerConfig.machine.ip);

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
  var start = function(data) {

    return Promise.each(normalizer(data), function(datum) {
      if (datum.cid) {
        return docker.start(data.cid, data.opts);
      }
      else if (datum.dirs) {
        return compose.start(datum.dirs, datum.opts);
      }
    });

  };

  /*
   * Do a docker exec into a container.
   */
  var exec = function(data) {
    return docker.exec(data.cid, data.opts);
  };

  /*
   * Check if container exists
   */
  var exists = function(cid) {

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
      return _.has(idSet, cid);
    });

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
  var query = function(data) {
    return docker.query(data.cid, data.cmd, data.opts);
  };

  /*
   * Run a query against a container, return data.
   */
  var queryData = function(data) {
    return docker.queryData(data.cid, data.cmd);
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
  var use = function(data) {

    // Extract our data
    // @todo: better checks
    var rawImage = data.rawImage;
    var createOpts = data.createOpts;
    var startOpts = data.startOpts;
    var fn = data.fn;

    return docker.use(rawImage, createOpts, startOpts, fn);
  };

  /*
   * Create and run a command inside of a container.
   */
  var run = function(data) {

    // Extract our data
    // @todo: better checks
    var rawImage = data.rawImage;
    var cmd = data.cmd;
    var createOpts = data.createOpts;
    var startOpts = data.startOpts;

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
  var remove = function(data) {
    return docker.remove(data.cid, data.opts);
  };

  /*
   * Read the contents of the containers logs.
   */
  var logs = function(data) {
    return docker.logs(data.cid, data.opts);
  };

  /*
   * Builds or pulls a docker image
   * NOTE: It's better to route all builds through docker instead of
   * compose
   *
   * Data can be either an image object or array of image object
   * Image objects have the following properties
   *
   *  'id'          => Arbitraty identified
   *  'build'       => Boolean to determine whether we should build or pull by default
   *  'createOpts'  => Array of remote docker API create opts
   *  'forcePull'   => Always pull from hub
   *  'name'        => Image name can be: imagename|repo/imagename|repo/imagename:tag
   *  'src'         => Path to a dockerfile
   *  'srcRoot'     => Path to a die that contains a dockerfile at dockerfiles/name/Dockerfil
   *  'startOpts'   => Array of remote docker API start options - Pending deprecation
   *
   */
  var build = function(data) {
    return Promise.each(normalizer(data), function(datum) {
      return docker.build(datum);
    });
  };

  return {
    build: build,
    create: create,
    exec: exec,
    exists: exists,
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
