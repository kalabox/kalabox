'use strict';

module.exports = function(kbox) {

  // Native modules
  var path = require('path');

  // NPM modules
  var chalk = require('chalk');
  var _ = require('lodash');
  var fs = require('fs-extra');
  var VError = require('verror');

  // Kbox modules
  var Promise = kbox.Promise;
  var util = require('./util.js')(kbox);
  var isNW = kbox.core.deps.get('globalConfig').isNW;

  // Get and load the install config
  var config = kbox.util.yaml.toJson(path.join(__dirname, 'config.yml'));

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
        done();
      }

      // If we are interactive then we have questions, questions that need
      // answering. We need to make sure this doesnt run in GUI installs
      // on windows otherwise we get a weird STDIN error
      else {
        // Get our authorize code
        var authorize = require('./steps/authorize.js')(kbox);

        // Kick off the auth chain
        return authorize(state)

        // Get the users response and exit if they do not confirm
        .then(function(answers) {
          if (!_.isEmpty(answers) && !answers.doit) {
            throw new Error('Fine! Be that way!');
          }
        })

        // Continue on
        .nodeify(done);
      }

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
          throw new Error(msg);
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
      // if not throw an error.
      .then(function(status) {

        // Fail step if our disk is not ready
        if (status !== 'READY') {
          throw new Error('Disk not ready!');
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
            throw new Error(msg.join('  '));
          }

        });
      })

      // Next step
      .nodeify(done);

    };
  });

  /*
   * Add the kalabox binary to the downloader if needed and we are in NW
   */
  if (isNW && util.needsKboxBinary()) {
    kbox.install.registerStep(function(step) {
      step.name = 'kbox-binary-downloads';
      step.description = 'Queuing up Kalabox binary downloads...';
      step.subscribes = ['core-downloads'];
      step.all = function(state) {

        // We only need this if we need to update the local binary
        if (util.needsKboxBinary()) {
          state.downloads.push(config.kalabox.pkg[process.platform]);
        }

        // Queue up some admin commands to get our bin in the path
        state.adminCommands.push(util.kboxBin2Path());

      };
    });
  }

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

      // Validate our downloads and throw an error if they
      // dont check out
      if (helpers.validate(downloads) !== true) {
        throw new Error(helpers.validate(downloads));
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
        throw new VError(err, 'Error downloading files.');
      })

      // Next step
      .nodeify(done);

    };
  });

  /*
   * If we need to do updates then we will need to install our syncthing
   * binary again
   */
  if (isNW && util.needsKboxBinary()) {
    kbox.install.registerStep(function(step) {
      step.name = 'kbox-binary-setup';
      step.description = 'Setting up kalabox binary...';
      step.deps = ['core-downloads'];
      step.all = function(state) {

        // Install the kalabox binary
        util.installKboxBinary(state);

      };
    });
  }

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

      // Update our bin version if we are in NW
      if (isNW && util.needsKboxBinary()) {
        state.updateCurrentInstall({KBOX_BIN_VERSION: config.kalabox.version});
      }

    };
  });

};
