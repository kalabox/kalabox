'use strict';

module.exports = function(kbox) {

  // Native modules
  var path = require('path');

  // Kalabox modules
  var util = require('./util.js')(kbox);

  // Services config
  var config = kbox.util.yaml.toJson(path.join(__dirname, 'config.yml'));

  /*
   * Submit core images for install
   */
  if (util.needsImages()) {
    kbox.install.registerStep(function(step) {
      step.name = 'services-kalabox-install';
      step.subscribes = ['core-image-build'];
      step.description = 'Adding services images to build list...';
      step.all = function(state) {
        var srcRoot = path.resolve(__dirname, '..');
        state.images.push({id: 'proxy', name: 'proxy', srcRoot: srcRoot});
        state.images.push({id: 'dns', name: 'dns', srcRoot: srcRoot});
      };

    });
  }

  /*
   * Rebuild core service images if needed
   */
  if (util.needsImages()) {
    kbox.install.registerStep(function(step) {
      step.name = 'services-kalabox-rebuild';
      step.deps = ['core-image-build'];
      step.description = 'Creating services...';
      step.all = function(state, done) {

        // Start the installer
        kbox.services.rebuild()

        // Catch any errors and fail the installer
        .catch(function(err) {
          state.fail(state, err);
        })

        // If we've gotten this far we can update our current install
        .then(function() {

          // Update our current install if no errors have been thrown
          if (state.status) {
            state.updateCurrentInstall({
              SERVICE_IMAGES_VERSION: config.version
            });
          }

        })

        // Next step
        .nodeify(done);

      };
    });
  }

 /*
  * Adds the appropriate downloads to our list
  */
  kbox.install.registerStep(function(step) {
    step.name = 'services-kalabox-downloads';
    step.description = 'Queuing up services downloads...';
    step.subscribes = ['core-downloads'];
    step.all.linux = function(state, done) {

      // Check to see if we need to get this package
      var pkg = kbox.util.pkg;

      // Check if we need to add a DNS command
      return pkg.exists('libnss-resolver')

      // If doesn't exist then add to the downloads
      .then(function(exists) {
        if (!exists) {
          state.downloads.push(util.getResolverPkgUrl());
        }
      })

      // Next step
      .nodeify(done);

    };
  });

  /*
   * Queue up admin commands we might need for DNS set up
   */
  kbox.install.registerStep(function(step) {
    step.name = 'services-kalabox-admin';
    step.description  = 'Queuing up services admin commands...';
    step.subscribes = ['core-run-admin-commands'];
    step.all.linux = function(state, done) {

      var pkg = kbox.util.pkg;

      // Check if we need to add a DNS command
      return pkg.exists('libnss-resolver')

      // Add the command to add our resolver tech if needed
      .then(function(exists) {
        if (!exists) {
          state.adminCommands.push(util.getResolverPkgInstall());
        }
      })

      // Next step
      .nodeify(done);

    };
  });

  /*
   * Sets up our DNS after we've pulled our images and we can ensure the profile
   * is set up correctly
   */
  kbox.install.registerStep(function(step) {
    step.name = 'services-kalabox-finalize';
    step.description = 'Setting up DNS...';
    step.deps = ['core-image-build'];
    step.all.linux = function(state, done) {

      // Set up Linux DNS
      util.setupLinuxDNS(state)

      // Fail step if we catch an error
      .catch(function(err) {
        state.fail(state, err);
      })

      // Reflect that DNS has been migrated to libnss-resolver
      .then(function() {
        if (state.status) {
          state.updateCurrentInstall({SERVICE_LIBNSS_RESOLVER: true});
        }
      })

      // Next Step
      .nodeify(done);

    };
    step.all.win32 = function(state, done) {

      // Set up darwin DNS
      util.setupWindowsDNS(state)

      // Fail step if we catch an error
      .catch(function(err) {
        state.fail(state, err);
      })

      // Next Step
      .nodeify(done);

    };
    step.all.darwin = function(state, done) {

      // Set up darwin DNS
      util.setupDarwinDNS(state)

      // Fail step if we catch an error
      .catch(function(err) {
        state.fail(state, err);
      })

      // Next Step
      .nodeify(done);

    };
  });

};
