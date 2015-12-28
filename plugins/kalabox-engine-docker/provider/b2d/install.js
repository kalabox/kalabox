'use strict';

module.exports = function(kbox) {

  // Native modules
  var path = require('path');

  // Kalabox modules
  var meta = require('./meta.js');
  var util = require('./util.js')(kbox);
  var Promise = kbox.Promise;

  // npm modules
  var _ = require('lodash');

  /*
   * Adds the appropriate downloads to our list
   */
  if (util.needsDownloads()) {
    kbox.install.registerStep(function(step) {
      step.name = 'engine-docker-downloads';
      step.description = 'Queuing up provider downloads...';
      step.subscribes = ['core-downloads'];
      step.all = function(state) {

        // What platform are we on?
        var platform = process.platform;

        // Only grab profile if needed
        if (util.needsProfile()) {
          state.downloads.push(meta.PROVIDER_PROFILE_URL);
        }

        // Only grab B2D if needed
        if (util.needsB2D()) {
          state.downloads.push(meta.PROVIDER_DOWNLOAD_URL[platform].b2d);
        }

        // Add extra stuff for Windosw if appropriate
        if (platform === 'win32' && util.needsInf()) {
          state.downloads.push(meta.PROVIDER_INF_URL);
        }

      };
    });
  }

  /*
   * Install the provider profile into the correct location
   */
  if (util.needsProfile()) {
    kbox.install.registerStep(function(step) {
      step.name = 'engine-docker-provider-profile';
      step.deps = ['core-downloads'];
      step.subscribes = ['engine-up'];
      step.description = 'Setting up the provider profile...';
      step.all = function(state) {

        // Install the profile
        util.installProfile(state);

        // Update our current install
        state.updateCurrentInstall({PROVIDER_PROFILE_VERSION: '0.10.0'});

      };
    });
  }

  /*
   * Installs the b2d bin into the correct location
   */
  if (util.needsB2D()) {
    kbox.install.registerStep(function(step) {
      step.name = 'engine-docker-provider-b2d';
      step.deps = ['core-downloads'];
      step.subscribes = ['engine-up'];
      step.description = 'Setting up the B2D binary...';
      step.all.linux = function(state, done) {

        // Install the profile
        util.installB2DLinux(state);

        // We need to do this to make sure the b2d bin is good before we
        // use it
        return Promise.delay(2000)

        .then(function() {
          // Update our current install
          state.updateCurrentInstall({PROVIDER_B2D_VERSION: '1.8.0'});
        })

        // next step
        .nodeify(done);

      };
    });
  }

  /*
   * Add in admin commands that are relevant to setting up the engine if
   * needed
   */
  if (util.needsAdminCommands()) {
    kbox.install.registerStep(function(step) {
      step.name = 'engine-docker-install-engine';
      step.description  = 'Queuing provider admin commands...';
      step.subscribes = ['core-run-admin-commands'];
      step.all.darwin = function(state, done) {

        // Grab the target volume
        return kbox.util.disk.getMacVolume()

        // Extract the volume UUID and then add the command if
        // we need it
        .then(function(data) {

          // Analyze volume data
          var match = data.match(/Volume UUID:[ ]*(.*)\n/);

          // Fail if there is no match
          if (!match) {
            state.fail(state, 'Cannot get your Mac volume UUID!');
          }

          // Add the install B2D command if we need to
          if (util.needsB2D()) {

            // Get package location
            var pkgDir = kbox.util.disk.getTempDir();
            var pkgName = path.basename(meta.PROVIDER_DOWNLOAD_URL.darwin.b2d);
            var pkg = path.join(pkgDir, pkgName);

            // Generate and add the command
            var cmd = kbox.util.pkg.installCmd(pkg, match[1]);
            state.adminCommands.push(cmd);

          }
        })

        // Next step
        .nodeify(done);

      };
      step.all.linux = function(state) {

        if (util.needsVB()) {

          // Get the metas
          var flavor = kbox.install.linuxOsInfo.getFlavor();
          var vb = meta.PROVIDER_DOWNLOAD_URL.linux.vb;
          var deps = vb[flavor].deps.join(' ');
          var pkgs = vb[flavor].packages.join(' ');
          var source = vb[flavor].source;
          var key = vb[flavor].key;

          // Add and refresh sources
          state.adminCommands.push(kbox.util.pkg.addSourceCmd(source, key));
          state.adminCommands.push(kbox.util.pkg.refreshSourcesCmd());

          // Install the deps first if we have them
          if (!_.isEmpty(deps)) {
            state.adminCommands.push(kbox.util.pkg.installCmd(deps));
          }

          // Install VB
          state.adminCommands.push(kbox.util.pkg.installCmd(pkgs));

        }

      };
      step.all.win32 = function(state) {

        // Add the install B2D command if we need to
        if (util.needsB2D()) {

          // Get the B2D pkg location
          var pkgDir = kbox.util.disk.getTempDir();
          var pkgName = path.basename(meta.PROVIDER_DOWNLOAD_URL.win32.b2d);
          var pkg = path.join(pkgDir, pkgName);
          var infFile = path.join(pkgDir, path.basename(meta.PROVIDER_INF_URL));

          // Build the install command and add it
          var cmd = kbox.util.pkg.installCmd(pkg, infFile);
          state.adminCommands.push(cmd);
        }

      };

    });
  }

  /*
   * If we got this far we can assume our admin commands ran ok
   */
  kbox.install.registerStep(function(step) {
    step.name = 'engine-docker-verify-admin';
    step.deps = ['core-run-admin-commands'];
    step.description = 'Updating install info...';
    step.all = function(state) {

      // Update our current install to reflect B2D installed
      // NOTE: linux handles this seperately
      if (util.needsB2D() && process.platform !== 'linux') {
        state.updateCurrentInstall({PROVIDER_B2D_VERSION: '1.8.0'});
      }

      // Update our current install to reflect VB installed
      if (util.needsVB() && process.platform === 'linux') {
        state.updateCurrentInstall({PROVIDER_VB_VERSION: '5.0.2'});
      }

      // Update our current install to reflect INF installed
      if (util.needsInf() && process.platform === 'win32') {
        state.updateCurrentInstall({PROVIDER_INF_VERSION: '0.10.0'});
      }

    };
  });

  /*
   * Attempt to update our B2D iso if needed
   */
  if (util.needsB2DIsoUpdate()) {
    kbox.install.registerStep(function(step) {
      step.name = 'engine-docker-update-iso';
      //step.deps = ['engine-docker-verify-admin'];
      step.subscribes = ['engine-up'];
      step.description = 'Updating B2D Iso';
      step.all = function(state, done) {

        // Make sure engine is down
        return kbox.engine.provider().call('down')

        // Try to do the iso update
        .then(function() {
          return kbox.engine.provider().call('getIso');
        })

        // Update the install state
        .then(function() {
          state.updateCurrentInstall({PROVIDER_B2D_ISO: '1.9.1'});
        })

        // Next step
        .nodeify(done);

      };
    });
  }

  /*
   * Start up the engine
   */
  kbox.install.registerStep(function(step) {
    step.name = 'engine-up';
    step.deps = ['engine-docker-verify-admin'];
    step.description = 'Setting up and activating the engine...';
    step.all = function(state, done) {

      // Update SSH keys if needed
      if (util.updateKeys(state)) {
        state.updateCurrentInstall({PROVIDER_B2D_KEYS: true});
      }

      // Just set the VM disk size to be the same as the total disk
      // size.
      // @todo: this logically seems to work fine but could
      // practically be an issue.
      // GUESS WE'LL SEE!
      return kbox.util.disk.getDiskStatus()

      // Calculate whether we have enough free space to install
      // if not fail and alert the user
      .then(function(status) {

        // Fail step if our disk is not ready
        if (status !== 'READY') {
          state.fail(state, 'Disk not ready!');
        }

        // Grab free space so we can use it for the disksize
        return kbox.util.disk.getDiskFreeSpace()

        .then(function(freeSpace) {

          // Calculate free space in MB
          return _.round(freeSpace / 1024 / 1024);

        });
      })

      // Init the engine
      .then(function(diskspace) {
        return kbox.engine.provider().call('up', {disksize: diskspace});
      })

      // Fail the step on an error
      .catch(function(err) {
        state.fail(state, err);
      })

      // Debug log out output
      .then(function(data) {
        if (data) {
          state.log.debug(data);
        }
      })

      // Next step
      .nodeify(done);

    };
  });

};
