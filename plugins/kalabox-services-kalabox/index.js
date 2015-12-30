'use strict';

/**
 * Kalabox lib -> services -> kbox module.
 * @module kbox
 */

module.exports = function(kbox) {

  // Npm modules
  var _ = require('lodash');
  var VError = require('verror');

  // Kbox modules
  var Promise = kbox.Promise;
  var meta = require('./lib/meta.js')(kbox);

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
      throw new VError(err, 'Failed to init services plugin tasks and events.');
    });
  });

  /*
   * Install services.
   */
  var install = function() {

    // Grab our services
    var services = meta.SERVICE_IMAGE_COMPOSE;

    // Log action
    log.debug('Creating services from ' + services);

    // Get service info and bind to this.
    return kbox.engine.create({dirs: [services]});

  };

  /*
   * Rebuild services.
   */
  var rebuild = function() {

    // Grab our services
    var services = meta.SERVICE_IMAGE_COMPOSE;

    // Log action
    log.debug('Rebuilding services from ' + services);

    // Get service info and bind to this.
    return kbox.engine.create({dirs: [services], opts: {recreate:true}});

  };

  /*
   * Verify services are in a good state.
   */
  var verify = function() {

    // Get service info.
    /*
    return serviceInfo()
    // Get startable services.
    .then(function(serviceInfo) {
      return serviceInfo.getStartableServices();
    })
    // Filter out services that are running.
    .filter(function(service) {
      return isServiceRunning(service)
      .then(function(isRunning) {
        return !isRunning && service.name !== 'data';
      });
    }, {concurrency: 1})
    // If there are any services not running, restart them all.
    .then(function(notRunningServices) {
      if (notRunningServices.length > 0) {
        return rebootServices();
      }
    });
    */

  };

  return {
    init: init,
    install: install,
    rebuild: rebuild,
    verify: verify
  };

};
