'use strict';

module.exports = function(kbox) {

  // Native modules
  var fs = require('fs');
  var path = require('path');

  // NPM modules
  var chalk = require('chalk');

  // Kbox modules
  var util = require('./util.js')(kbox);

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
        if (!answers.doit) {
          state.log.info(chalk.red('Fine!') + ' Be that way!');
          process.exit(1);
        }
      })

      // Move onto the next step
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
