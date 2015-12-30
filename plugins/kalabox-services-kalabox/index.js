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
  var meta = require('./lib/meta.js')(kbox);
  var servicesDir = meta.SERVICE_IMAGE_COMPOSE;
  var servicesFile = path.join(servicesDir, 'kalabox-compose.yml');

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

    // Log action
    log.debug('Creating services from ' + servicesFile);

    // Get service info and bind to this.
    return kbox.engine.create({dirs: [servicesDir]});

  };

  /*
   * Rebuild services.
   */
  var rebuild = function() {

    // Log action
    log.debug('Rebuilding services from ' + servicesFile);

    // Get service info and bind to this.
    return kbox.engine.create({dirs: [servicesDir], opts: {recreate:true}});

  };

  /*
   * Verify services are in a good state.
   */
  var verify = function() {

    log.debug('Verifying services are up');

    // Get an array of our services container names
    var services = _.map(kbox.util.yaml.toJson(servicesFile), function(s) {
      // Stupid thing to tric codestylez
      s = s;
      // jscs:disable
      /* jshint ignore:start */
      return s.container_name;
      /* jshint ignore:end */
      // jscs:enable
    });

    // Discover if we need to boot up our services
    return Promise.reduce(services, function(running, service) {
      return kbox.engine.isRunning(service);
    }, false)

    // Restart our services if needed
    .then(function(running) {
      if (!running) {
        log.debug('Services are not running. Restarting...');
        return kbox.engine.start({dirs: [servicesDir]});
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
