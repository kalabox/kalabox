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

  // Helper func for when a step fails
  var fail = function(state, msg) {
    state.log.info(chalk.red(msg));
    state.status = false;
  };

  // Add common steps
  //require('./steps/common.js')(kbox);

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
          fail(state, 'Fine! Be that way!');
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
          fail(state, msg);
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

      var url = 'www.google.com';
      state.log.debug('Checking: ' + url);

      return kbox.util.internet.check(url)

      .then(function(connected) {
        if (!connected) {
          var msg = 'You are not currently connected to the internet!';
          fail(state, msg);
        }
      })

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
          fail(state, 'Disk not ready!');
        }

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
            fail(state, msg.join(' '));
          }

        });

      })

      .nodeify(done);

    };
  });

  // Run administator commands
  /*
  kbox.install.registerStep(function(step) {
    step.name = 'core-run-admin-commands';
    step.deps = ['core-auth'];
    if (process.platform === 'win32') {
      // @todo: this should be a core dep
      step.deps.push('engine-docker-provider-profile');
    }
    step.description = 'Running admin install commands...';
    step.all = function(state, done) {
      var adminCommands = state.adminCommands;
      util.runAdminCmds(adminCommands, state, done);
    };
  });

  kbox.install.registerStep(function(step) {
    step.name = 'core-prepare-usr-bin';
    step.description  = 'Preparing /usr/local/bin...';
    step.subscribes = ['core-run-admin-commands'];
    step.deps = ['core-auth'];
    step.all.linux = function(state, done) {
      var owner = [process.env.USER, process.env.USER].join(':');
      state.adminCommands.unshift('chown ' + owner + ' /usr/local/bin');
      if (!fs.existsSync('/usr/local/bin')) {
        state.adminCommands.unshift('mkdir -p /usr/local/bin');
      }
      done();
    };
  });

  kbox.install.registerStep(function(step) {
    step.name = 'core-finish';
    step.description = 'Finishing install...';
    // @todo: need core dep
    step.deps = ['services-kalabox-finalize'];
    step.all = function(state, done) {
      fs.writeFileSync(
        path.join(state.config.sysConfRoot, 'provisioned'),
        'true'
      );
      done();
    };
  });
*/

};
