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
  var servicesFile = path.join(__dirname, 'kalabox-compose.yml');

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
   * Install services.
   */
  var install = function() {

    // Log action
    log.debug('Creating services from ' + servicesFile);

    // Set our compose env so our containers get appropriate names
    kbox.core.env.setEnv('COMPOSE_PROJECT_NAME', 'kalabox_');

    // Get service info and bind to this.
    return kbox.engine.create({compose: [servicesFile]});

  };

  /*
   * Rebuild services.
   */
  var rebuild = function() {

    // Log action
    log.debug('Rebuilding services from ' + servicesFile);

    // Set our compose env so our containers get appropriate names
    kbox.core.env.setEnv('COMPOSE_PROJECT_NAME', 'kalabox_');

    // Get service info and bind to this.
    return kbox.engine.create({compose: [servicesFile], opts: {recreate:true}});

  };

  /*
   * Verify services are in a good state.
   */
  var verify = function() {

    log.debug('Verifying services are up');

    // Get our containers
    return kbox.engine.list()

    // Filter out services
    .filter(function(container) {
      return container.kind === 'service';
    })

    // Discover if we need to boot up our services
    .reduce(function(running, service) {
      return kbox.engine.isRunning(service.id);
    }, false)

    // Restart our services if needed
    .then(function(running) {
      if (!running) {

        log.debug('Services are not running. Restarting...');

        // Set our compose env so our containers get appropriate names
        kbox.core.env.setEnv('COMPOSE_PROJECT_NAME', 'kalabox_');
        // Start up our services again
        return kbox.engine.start({compose: [servicesFile]});
      }
    });

  };

  return {
    init: init,
    install: install,
    rebuild: rebuild,
    verify: verify
  };

};
