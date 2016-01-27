'use strict';

module.exports = function(kbox) {

  // Native modules
  var path = require('path');

  // NPM modules
  var chalk = require('chalk');
  var _ = require('lodash');
  var fs = require('fs-extra');

  // Kbox modules
  var Promise = kbox.Promise;

  /*
   * This step attempts to get authorization from the user that we can
   * proceed with the installer or updater as long as non-interactive has not
   * been specificed
   */
  kbox.install.registerStep(function(step) {
    step.name = 'core-auth';
    step.first = true;
    step.description = 'Authorizing trilling subroutines...';
    step.all = function(state, done) {

      // If we are in non-interactive mode report that
      if (state.nonInteractive) {
        state.log.info(chalk.grey('Non-interactive mode.'));
      }

      // Get our authorize code
      var authorize = require('./steps/authorize.js')(kbox);

      // Kick off the auth chain
      return authorize(state)

      // Get the users response and exit if they do not confirm
      .then(function(answers) {
        if (!_.isEmpty(answers) && !answers.doit) {
          state.fail(state, 'Fine! Be that way!');
        }
      })

      // Move onto the next step
      .nodeify(done);

    };
  });

  /*
   * Make sure our firewall is in a correct state
   */
  kbox.install.registerStep(function(step) {
    step.name = 'core-firewall';
    step.description = 'Checking firewall settings...';
    step.all = function(state, done) {

      // Check if our firewall is ok
      return kbox.util.firewall.isOkay()

      // If we are OK proceed, if we are not
      // throw an error
      .then(function(isOkay) {
        if (!isOkay) {
          var msg = 'You need to make sure your firewall is not blocking all';
          state.fail(state, msg);
        }
      })

      // Next step;
      .nodeify(done);
    };
  });

  /*
   * Make sure we can establish a connection to the internet
   */
  kbox.install.registerStep(function(step) {
    step.name = 'core-internet';
    step.description = 'Checking for Internet access...';
    step.deps = ['core-firewall'];
    step.all = function(state, done) {

      // Attempt to connect
      return kbox.util.internet.check()

      // Next step
      .nodeify(done);

    };
  });

  /*
   * Check to see whether we have enough free disk space to install
   */
  kbox.install.registerStep(function(step) {
    step.name = 'core-disk-space';
    step.subscribes = ['engine-up'];
    step.description = 'Checking for available disk space...';
    step.all = function(state, done) {

      // Make sure our disc is G2G
      return kbox.util.disk.getDiskStatus()

      // Calculate whether we have enough free space to install
      // if not fail and alert the user
      .then(function(status) {

        // Fail step if our disk is not ready
        if (status !== 'READY') {
          state.fail(state, 'Disk not ready!');
        }

        // Now check to see if we have enough free space
        return kbox.util.disk.getDiskFreeSpace()

        .then(function(freeSpace) {

          // Calculate free space in MB
          state.log.debug('FREE SPACE => ' + freeSpace);
          var freeMB = _.round(freeSpace / 1024 / 1024);

          // Space required in MB
          var neededMB = 2000;
          var enoughFreeSpace = freeMB > neededMB;
          // Fail the step if we need more space
          if (!enoughFreeSpace) {
            var msg = ['You need at least', neededMB, 'MB to install!'];
            state.fail(state, msg.join(' '));
          }

        });
      })

      // Next step
      .nodeify(done);

    };
  });

  /*
   * Download all the files that are in state.download
   */
  kbox.install.registerStep(function(step) {
    step.name = 'core-downloads';
    step.description = 'Downloading files...';
    step.deps = ['core-internet'];
    step.all = function(state, done) {

      // Get our download helpers
      var helpers = require('./steps/downloads.js')(kbox);

      // Grab downloads from state.
      var downloads = state.downloads;

      // Validate our downloads and fail if they
      // dont check out
      if (helpers.validate(downloads) !== true) {
        state.fail(state, helpers.validate(downloads));
      }

      // Get our temp dir
      var downloadDir = kbox.util.disk.getTempDir();

      // Log the downloads
      downloads.forEach(function(url) {
        state.log.debug([url, downloadDir].join(' -> '));
      });

      // Download the filezz
      return kbox.util.download.downloadFiles(downloads, downloadDir)

      // Fail the step if we catch an error
      .catch(function(err) {
        state.fail(state, err);
      })

      // Next step
      .nodeify(done);

    };
  });

  /*
   * Runs a prebuilt list of admin commands if there are any
   */
  kbox.install.registerStep(function(step) {
    step.name = 'core-run-admin-commands';
    step.deps = ['core-downloads'];
    step.description = 'Running admin install commands...';
    step.all = function(state, done) {

      // Run the admin commands if we have any
      if (!_.isEmpty(state.adminCommands)) {
        return kbox.util.shell.execAdminAsync(state.adminCommands)
        .catch(function(err) {
          state.fail(state, err);
        })
        .nodeify(done);
      }
      else {
        done();
      }

    };
  });

  /*
   * Grab any containers that need to be installed
   * @todo: This assumes a step called engine-up exists somewhere?
   */
  kbox.install.registerStep(function(step) {
    step.name = 'core-image-build';
    step.deps = ['engine-up'];
    step.description = 'Pulling images...';
    step.all = function(state, done) {

      // Dedupe images
      state.log.debug('PULLING IMAGES => ' + JSON.stringify(state.images));

      // Build all teh submitted images
      return Promise.retry(function() {
        return kbox.engine.build(state.images);
      })

      // If this errors then fail the step
      .catch(function(err) {
        state.fail(state, err);
      })

      // Next step
      .nodeify(done);

    };
  });

  /*
   * A final step so we can update our version stuff
   */
  kbox.install.registerStep(function(step) {
    step.name = 'core-done';
    step.last = true;
    step.description = 'Finishing install';
    step.all = function(state) {

      // Write the provisioned file
      var proFile = path.join(state.config.sysConfRoot, 'provisioned');
      fs.writeFileSync(proFile, 'true');

      // Update our current install file
      var kVersion = state.config.version;
      state.updateCurrentInstall({KALABOX_VERSION: kVersion});

    };
  });

};
