'use strict';

/**
 * Kalabox lib -> services -> kbox module.
 * @module kbox
 */

module.exports = function(kbox) {

  var _ = require('lodash');
  var Promise = kbox.Promise;
  var fs = require('fs');
  var mkdirp = require('mkdirp');
  var VError = require('verror');
  var pp = require('util').inspect;

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
   * Load services info module.
   */
  var serviceInfo = _.once(function() {
    // Load services module.
    return Promise.try(function() {
      return require('./lib/services.js')(kbox);
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Failed to initialize services info.');
    });

  });

  /*
   * Query engine to find out running status of service.
   */
  var isServiceRunning = function(service) {

    // Get service info.
    return serviceInfo()
    // Get cid of service.
    .then(function(serviceInfo) {
      return serviceInfo.getCid(service);
    })
    // Query engine to find out running status of service.
    .then(function(cid) {
      return kbox.engine.isRunning(cid);
    });

  };

  /*
   * Install a service.
   */
  var installService = function(service) {

    // Build service.
    return kbox.engine.build(service)
    // Get service info.
    .then(function() {
      return serviceInfo();
    })
    // Create service.
    .then(function(serviceInfo) {
      if (service.createOpts) {
        // Get install options.
        var installOpts = serviceInfo.getInstallOptions(service);
        // Create service.
        return kbox.engine.create(installOpts)
        // Write service's cid file.
        .then(function(container) {
          return Promise.fromNode(function(cb) {
            var filepath = serviceInfo.getCidFile(service);
            fs.writeFile(filepath, container.cid, cb);
          });
        });
      }
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(
        err, 'Error installing service "%s".', JSON.stringify(service)
      );
    });

  };

  /*
   * Rebuild service.
   */
  var rebuildService = function(service) {

    // Bind in our helper module
    return serviceInfo()
    .bind({})
    .then(function(serviceInfo) {
      this.serviceInfo = serviceInfo;
      return serviceInfo.getCid(service);
    })

    // If we have a CID try to reset the container
    .then(function(cid) {
      if (cid !== false) {
        // Check if our CID still exists
        return kbox.engine.containerExists(cid)

        // If the container exists check that it is running and if it is
        // stop it, then destroy the container if it isn't a data container
        .then(function(exists) {

          // Containers exists
          // @todo: clean up cid file if it doesnt?
          if (exists) {
            // Check if we are running
            return isServiceRunning(service)
            // Stop if running
            .then(function(isRunning) {
              if (isRunning) {
                return kbox.engine.stop(cid);
              }
            })
            // Remove if not data container
            .then(function() {
              if (service.createOpts.name !== 'kalabox_data') {
                return kbox.engine.remove(cid);
              }
            });
          }

        });
      }
    })

    // Create the container
    .then(function() {

      // In some cases we dont want to remove the container so check
      // existence again
      // Check if our CID still exists
      var self = this;
      return kbox.engine.containerExists(self.serviceInfo.getCid(service))

      // Should be safe to create at this point
      .then(function(exists) {

        if (!exists) {

          // Get install options.
          var installOpts = self.serviceInfo.getInstallOptions(service);

          // Create service.
          return kbox.engine.create(installOpts)

          // Write service's cid file.
          .then(function(container) {
            return Promise.fromNode(function(cb) {
              var filepath = self.serviceInfo.getCidFile(service);
              fs.writeFile(filepath, container.cid, cb);
            });
          });

        }

      });

    })

    // Wrap errors.
    .catch(function(err) {
      throw new VError(
        err, 'Error rebuilding service "%s".', JSON.stringify(service)
      );
    });

  };

  /*
   * Start a service.
   */
  var startService = function(service) {

    // Get service info.
    return serviceInfo()
    // Bind empty object.
    .bind({})
    // Get service info and cid.
    .then(function(serviceInfo) {
      this.startOpts = serviceInfo.getStartOptions(service);
      this.cid = serviceInfo.getCid(service);
    })
    // Start service.
    .then(function() {
      return kbox.engine.start(this.cid, this.startOpts);
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error starting service "%s".', pp(service));
    });

  };

  /*
   * Stop a service.
   */
  var stopService = function(service) {

    // Get service info.
    return serviceInfo()
    // Get cid.
    .then(function(serviceInfo) {
      return serviceInfo.getCid(service);
    })
    // Stop service.
    .then(function(cid) {
      return kbox.engine.stop(cid);
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error stopping service "%s".', service);
    });

  };

  /*
   * Start all startable services.
   */
  var start = function() {

    // Get service info.
    return serviceInfo()
    // Get startable services.
    .then(function(serviceInfo) {
      return serviceInfo.getStartableServices();
    })
    // Start services.
    // @todo: @bcauldwell - This should be a map all so an error doesn't
    // stop any of the services from starting.
    .map(function(service) {
      return startService(service);
    }, {concurrency: 1})
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error starting services.');
    });

  };

  /*
   * Stop all startable services.
   */
  var halt = function() {

    // Get service info.
    return serviceInfo()
    // Get startable services.
    .then(function(serviceInfo) {
      return serviceInfo.getStartableServices();
    })
    // Stop each service one at a time.
    // @todo: @bcauldwell - This should be a map all so an error doesn't
    // stop any of the services from stopping.
    .map(function(service) {
      return stopService(service);
    }, {concurrency: 1})
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error stopping services.');
    });

  };

  /*
   * Restart all startable services.
   */
  var rebootServices = function() {

    // Log start.
    log.info('Startup services need to be started.');

    // Stop services.
    return halt()
    // Start services.
    .then(function() {
      return start();
    });

  };

  /*
   * Install services.
   */
  var install = function() {

    // Get service info and bind to this.
    return serviceInfo()
    .bind({})
    .then(function(serviceInfo) {
      this.serviceInfo = serviceInfo;
    })
    // Make sure cid directory exists.
    .then(function() {
      var cidRoot = this.serviceInfo.getCidRoot();
      return Promise.fromNode(function(cb) {
        mkdirp(cidRoot, cb);
      });
    })
    // Get list of services.
    .then(function() {
      return this.serviceInfo.getCoreImages();
    })
    // Install each service.
    .map(installService, {concurrency: 1})
    // Wrap errors.
    .catch(function(err) {
      JSON.stringify(err);
      throw new VError(err, 'Error installing services.');
    });

  };

  /*
   * Rebuild services.
   */
  var rebuild = function() {

    // Get service info and bind to this.
    return serviceInfo()
    .bind({})
    .then(function(serviceInfo) {
      this.serviceInfo = serviceInfo;
    })
    // Make sure cid directory exists.
    .then(function() {
      var cidRoot = this.serviceInfo.getCidRoot();
      return Promise.fromNode(function(cb) {
        mkdirp(cidRoot, cb);
      });
    })
    // Get list of services.
    .then(function() {
      return this.serviceInfo.getStartableServices();
    })
    // Install each service.
    .map(rebuildService, {concurrency: 1})
    // Wrap errors.
    .catch(function(err) {
      JSON.stringify(err);
      throw new VError(err, 'Error rebuilding services.');
    });

  };

  /*
   * Verify services are in a good state.
   */
  var verify = function() {

    // Get service info.
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

  };

  return {
    init: init,
    install: install,
    rebuild: rebuild,
    verify: verify
  };

};
