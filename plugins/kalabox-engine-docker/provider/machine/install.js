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

  // Constants
  var PROVIDER_VB_VERSION = meta.PROVIDER_VB_VERSION;
  var PROVIDER_KALABOX_ISO = meta.PROVIDER_KALABOX_ISO;
  var PROVIDER_MACHINE_VERSION = meta.PROVIDER_MACHINE_VERSION;
  var PROVIDER_COMPOSE_VERSION = meta.PROVIDER_COMPOSE_VERSION;
  var PROVIDER_MSYSGIT_VERSION = meta.PROVIDER_MSYSGIT_VERSION;

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

        // Only grab docker machine if needed
        if (util.needsMachine()) {
          state.downloads.push(meta.PROVIDER_DOWNLOAD_URL[platform].machine);
        }

        // Only grab docker compose if needed
        if (util.needsCompose()) {
          state.downloads.push(meta.PROVIDER_DOWNLOAD_URL[platform].compose);
        }

        // Only grab VirtualBox if needed
        // @todo: On linux we install with normal package manager
        if (process.platform !== 'linux' && util.needsVB()) {
          state.downloads.push(meta.PROVIDER_DOWNLOAD_URL[platform].vb);
        }

        // Only grab msysgit on windows if needed
        if (process.platform === 'win32' && util.needsMsysgit()) {
          state.downloads.push(meta.PROVIDER_DOWNLOAD_URL.win32.msysgit);
        }

      };
    });
  }

  /*
   * Installs the machine bin into the correct location
   */
  if (util.needsMachine() || util.needsCompose()) {
    kbox.install.registerStep(function(step) {
      step.name = 'engine-docker-provider-machine';
      step.deps = ['core-downloads'];
      step.subscribes = ['engine-up'];
      step.description = 'Setting up the docker machine...';
      step.all = function(state, done) {

        // Install the machine
        if (util.needsMachine()) {
          util.installMachine(state);
        }

        // Install the compose
        if (util.needsCompose()) {
          util.installCompose(state);
        }

        // We need to do this to make sure the docker bins is good before we use it
        return Promise.delay(2000)

        // Next step
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

          // Add the install VM command if we need to
          if (util.needsVB()) {

            // Get package location
            var pkg = path.join(kbox.util.disk.getTempDir(), 'VirtualBox.pkg');

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

        // All the temp directory
        var tmp = kbox.util.disk.getTempDir();

        // Add the install VB commands if we need to
        if (util.needsVB()) {

          // Get info about where the things are
          var vb = path.basename(meta.PROVIDER_DOWNLOAD_URL.win32.vb);
          var vbPkg = path.join(tmp, vb);
          var extractDir = path.join(tmp, 'vbox');

          // Build the extraction command
          var extractOptions = [
            '-extract',
            '-path "' + extractDir + '"',
            '-silent'
          ];
          var extractCmd = kbox.util.pkg.installCmd(vbPkg, extractOptions);
          state.adminCommands.push(extractCmd);

          // Build the install command
          var vbInstallOptions = ['/qn', '/norestart'];
          // Split into parts VIRTUALBOX|VERSION|RELEASE|ARCH
          var pts = vb.split('-');
          var msiName = [pts[0], pts[1], 'r' + pts[2], 'MultiArch_amd64.msi'];
          var msiPkg = path.join(extractDir, msiName.join('-'));
          var installVbCmd = kbox.util.pkg.installCmd(msiPkg, vbInstallOptions);
          state.adminCommands.push(installVbCmd);

        }

        // Add the mysysgit installer command if needed
        if (util.needsMsysgit()) {

          // Get info about where the things are
          var mGit = path.basename(meta.PROVIDER_DOWNLOAD_URL.win32.msysgit);
          var mGitPkg = path.join(tmp, mGit);

          // Build the extraction command
          var mGitOptions = [
            '/SP',
            '/SILENT',
            '/VERYSILENT',
            '/SUPRESSMSGBOXES',
            '/NOCANCEL',
            '/NOREBOOT',
            '/NORESTART',
            '/CLOSEAPPLICATIONS'
          ];
          var installmGitCmd = kbox.util.pkg.installCmd(mGitPkg, mGitOptions);
          state.adminCommands.push(installmGitCmd);
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

      // Update our current install to reflect Machine installed
      if (util.needsMachine()) {
        state.updateCurrentInstall({
          PROVIDER_MACHINE_VERSION: PROVIDER_MACHINE_VERSION
        });
      }

      // Update our current install to reflect compose installed
      if (util.needsCompose()) {
        state.updateCurrentInstall({
          PROVIDER_COMPOSE_VERSION: PROVIDER_COMPOSE_VERSION
        });
      }

      // Update our current install to reflect VB installed
      if (util.needsVB()) {
        state.updateCurrentInstall({
          PROVIDER_VB_VERSION: PROVIDER_VB_VERSION
        });
      }

      // Update our current install to reflect msysgit installed
      if (process.platform === 'win32' && util.needsMsysgit()) {
        state.updateCurrentInstall({
          PROVIDER_MSYSGIT_VERSION: PROVIDER_MSYSGIT_VERSION
        });
      }

    };
  });

  /*
   * Attempt to update our B2D iso if needed
   */
  if (util.needsKalaboxIsoUpdate()) {
    kbox.install.registerStep(function(step) {
      step.name = 'engine-docker-update-iso';
      step.subscribes = ['engine-up'];
      step.description = 'Updating Kalabox ISO if needed...';
      step.all = function(state, done) {

        // Make sure we are installed
        return kbox.engine.provider().call('isInstalled')

        // If we are installed then we are clear to update
        .then(function(installed) {
          if (installed) {

            // Try to do the iso update
            return kbox.engine.provider().call('getIso')

            // Update the install state
            .then(function() {
              state.updateCurrentInstall({
                PROVIDER_KALABOX_ISO: PROVIDER_KALABOX_ISO
              });
            });
          }
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

      // Just set the VM disk size to be the same as the total disk size.
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
