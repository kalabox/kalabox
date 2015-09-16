'use strict';

module.exports = function(kbox) {

  // Native modules
  var fs = require('fs');
  var path = require('path');

  // NPM modules
  var chalk = require('chalk');
  var _ = require('lodash');

  // Kbox modules
  var util = require('./util.js')(kbox);
  var Promise = kbox.Promise;

  /*
   * This step attempts to get authorization from the user that we can
   * proceed with the installer or updater as long as non-interactive has not
   * been specificed
   */
  kbox.install.registerStep(function(step) {
    step.name = 'core-auth';
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
    step.deps = ['core-auth'];
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

      // Places to go
      var url = 'www.google.com';
      state.log.debug('Checking: ' + url);

      // Attempt to connect
      return kbox.util.internet.check(url)

      // If connect fails then so does this step!
      .then(function(connected) {
        if (!connected) {
          var msg = 'You are not currently connected to the internet!';
          state.fail(state, msg);
        }
      })

      // Next step
      .nodeify(done);

    };
  });

  /*
   * Check to see whether we have enough free disk space to install
   */
  kbox.install.registerStep(function(step) {
    step.name = 'core-disk-space';
    step.description = 'Checking for available disk space...';
    step.deps = ['core-auth'];
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
          var freeMB = freeSpace / 1024 / 1024;

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
    step.deps = [
      'core-disk-space',
      'core-internet'
    ];
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

      .then(function(files) {
        // @todo: Do want to validate anything here?
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

      // Grab our admin helpers
      var admin = require('./steps/admin.js')(kbox);

      // Run the admin commands if we have any
      if (!_.isEmpty(state.adminCommands)) {
        state.log.debug('COMMANDS => ' + JSON.stringify(state.adminCommands));
        admin.run(state.adminCommands, state, done);
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
      var images = _.uniq(state.images, 'name');
      state.log.debug('PULLING IMAGES => ' + JSON.stringify(images));

      // Cycle through images and build each
      return Promise.each(images, function(image) {
        return kbox.engine.build(image)

        // If this errors then fail the step
        .catch(function(err) {
          state.fail(state, err);
        });
      })

      // Next step
      .nodeify(done);

    };
  });

  /*
   * Update our app code and rebuild our apps
   */
  kbox.install.registerStep(function(step) {
    step.name = 'core-app-update';
    step.deps = ['engine-up'];
    step.description = 'Updating apps...';
    step.all = function(state, done) {

      // Grab some helpers
      var helpers = require('./steps/app.js')(kbox);

      // List all known apps
      return kbox.app.list()

      // Go through and update each app if needed
      .each(function(app) {

        // Grab the app version
        var appVersion = helpers.getAppVersion(app);

        // Check it we actually need to update
        if (helpers.needsUpdates(appVersion, app.config.appType)) {

          // Debug log some things
          state.log.debug('UPDATING APP TYPE => ' + app.config.appType);
          state.log.debug('UPDATING VERSION => ' + appVersion);
          state.log.debug('UPDATING APP => ' + app.name);

          // Update the apps code
          return helpers.updateAppCode(app)

          // Rebuild the apps containers
          .then(function() {
            return kbox.app.rebuild(app);
          });
        }
      })

      // If error then fail the step
      .catch(function(err) {
        state.fail(state, err);
      })

      // next step
      .nodeify(done);

    };
  });

};
