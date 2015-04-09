'use strict';

var chalk = require('chalk');
var fs = require('fs');

module.exports = function(kbox) {

  var util = require('./util.js')(kbox);

  // Add common steps
  require('./steps/common.js')(kbox, 'install');

  // Prepares /usr/local/bin on nix
  kbox.install.registerStep(function(step) {
    step.name = 'core-prepare-usr-bin';
    step.description  = 'Preparing /usr/local/bin';
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

  // Run administator commands.
  kbox.install.registerStep(function(step) {
    step.name = 'core-run-admin-commands';
    step.description = 'Running admin install commands...';
    step.all = function(state, done) {
      // Grab admin commands from state.
      var adminCommands = state.adminCommands;
      util.runAdminCmds(adminCommands, done);
    };
  });

};
