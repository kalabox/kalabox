'use strict';

var _ = require('lodash');
var assert = require('assert');
var kbox = require('./kbox.js');
var core = kbox.core;
var Promise = require('bluebird');
var VError = require('verror');
var util = require('util');

module.exports = _.once(function(mode, done) {

  // Optional argument handling.
  if (!done && typeof mode === 'function') {
    done = mode;
    mode = null;
  }

  // Set default mode and validate.
  mode = mode || 'cli';
  var validModes = ['cli', 'gui'];
  if (!_.contains(validModes, mode)) {
    var msg = util.format(
      'Invalid mode "%s", must be one of the following "%s".',
      mode,
      validModes
    );
    throw new Error(msg);
  }

  // Argv stuff.
  if (mode === 'cli' || mode === 'gui') {
    /*
     * In the near future we will want to handle cli and gui
     * argv initialization differently.
     */
    var argv = kbox.tasks.partitionArgv(process.argv.slice(2));
    core.deps.register('argv', argv);
    core.deps.register('verbose', argv.options.verbose);
    core.deps.register('buildLocal', argv.options.buildLocal);
  } else {
    assert.fail('unexpected mode');
  }

  // Start promise chain.
  return Promise.resolve()

  // Bind an empty object.
  .bind({})

  // Load and register the global config.
  .then(function() {
    var self = this;
    return Promise.try(function() {
      self.globalConfig = core.config.getGlobalConfig();
    })
    .catch(function(err) {
      throw new VError(err, 'Failed to load global config.');
    })
    .then(function() {
      core.deps.register('globalConfig', self.globalConfig);
      core.deps.register('config', self.globalConfig);
    });
  })

  // Register other dependencies.
  .then(function() {
    // Register global library.
    core.deps.register('kbox', kbox);
    // Register events.
    core.deps.register('events', kbox.core.events);
    // Register global require method.
    core.deps.register('kboxRequire', kbox.require);
    // Register kalabox mode.
    core.deps.register('mode', mode);
    // Register global shell.
    core.deps.register('shell', kbox.util.shell);
  })

  // Init and register engine.
  .then(function() {
    return kbox.engine.init(this.globalConfig)
    .then(function() {
      core.deps.register('engine', kbox.engine);
    });
  })

  // Init and register services.
  .then(function() {
    return kbox.services.init()
    .then(function() {
      core.deps.register('services', kbox.services);
    });
  })

  // Init plugins.
  .then(function() {
    var self = this;
    var plugins = self.globalConfig.globalPlugins;
    return Promise.map(plugins, function(plugin) {
      return kbox.require(plugin);
    }, {concurrency: 1})
    .all();
  })

  // Return global config.
  .then(function() {
    return this.globalConfig;
  })

  // Allow callback or returning of a promise.
  .nodeify(done);

});
