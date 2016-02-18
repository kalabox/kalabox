/**
 * Kalabox initialization system.
 *
 * @name init
 */

'use strict';

var _ = require('lodash');
var assert = require('assert');
var kbox = require('./kbox.js');
var core = kbox.core;
var Promise = require('bluebird');
var VError = require('verror');
var util = require('util');

module.exports = _.once(function(opts, done) {

  // Optional argument handling.
  if (!done && typeof opts === 'function') {
    done = opts;
    opts = null;
  }

  // Handle case where opts is a string value for mode.
  if (typeof opts === 'string') {
    opts = {
      mode: opts
    };
  }

  // Set default mode and validate.
  var mode = opts.mode || 'cli';
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

  } else {
    assert.fail('unexpected mode');
  }

  // Start promise chain.
  return Promise.resolve()

  // Bind an empty object.
  .bind({})

  // Load, register the global config and then set it into the env
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
    })
    .then(function() {
      core.env.setEnvFromObj(self.globalConfig);
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
