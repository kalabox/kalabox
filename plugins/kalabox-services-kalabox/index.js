'use strict';

/**
 * Kalabox lib -> services -> kbox module.
 * @module kbox
 */

module.exports = function(kbox) {

  // Native
  var path = require('path');

  // Npm modules
  var _ = require('lodash');
  var VError = require('verror');

  // Kbox modules
  var Promise = kbox.Promise;

  // Path to our compose file
  var coreServices = {
    compose: [path.join(__dirname, 'kalabox-compose.yml')],
    project: 'kalabox'
  };

  /*
   * Logging functions.
   */
  var log = kbox.core.log.make('SERVICES');

  /*
   * Initialize events and tasks.
   */
  var init = _.once(function() {
    // Load and initialize events and tasks.
    return Promise.try(function() {
      require('./lib/events.js')(kbox);
      require('./lib/install.js')(kbox);
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Failed to init services plugin.');
    });
  });

  /*
   * Rebuild services.
   */
  var rebuild = function() {

    // Log action
    log.debug('Starting services from ' + coreServices);

    // Add in force recreate
    var recreateServices = coreServices;
    recreateServices.opts = {recreate: true};

    return kbox.engine.start(recreateServices);

  };

  /*
   * Verify services are in a good state.
   */
  var verify = function() {

    log.debug('Verifying services are up');

    // Start component collector
    var components = {};

    // Load our core kalabox-compose.yml
    _.forEach(coreServices.compose, function(file) {
      _.extend(components, kbox.util.yaml.toJson(file));
    });

    // Get our containers
    return Promise.resolve(_.keys(components))

    // Filter out services
    .map(function(service) {
      var check = coreServices;
      check.opts = {service: service};
      return kbox.engine.inspect(check);
    })

    // Discover if we need to boot up our services
    .reduce(function(running, service) {
      return kbox.engine.isRunning(service.Id);
    }, false)

    // Restart our services if needed
    .then(function(running) {
      if (!running) {
        return rebuild(coreServices);
      }
    });

  };

  return {
    init: init,
    rebuild: rebuild,
    verify: verify
  };

};
