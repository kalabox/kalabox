'use strict';

var chalk = require('chalk');
var fs = require('fs');

module.exports = function(kbox) {

  var util = require('./util.js')(kbox);

  // Add common steps
  require('./steps/common.js')(kbox, 'install');

  // Downloads.
  kbox.install.registerStep(function(step) {
    step.name = 'downloads';
    step.description = 'Download installation files.';
    step.deps = ['disk-space', 'internet'];
    step.all = function(state, done) {
      // Grab downloads from state.
      var downloads = state.downloads;
      util.downloadFiles(downloads, done);
    };
  });

  // Prepares /usr/local/bin on nix
  kbox.install.registerStep(function(step) {
    step.name = 'prepare-usr-bin';
    step.description  = 'Preparing /usr/local/bin';
    step.subscribes = ['run-admin-commands'];
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
    step.name = 'run-admin-commands';
    step.description = 'Run shell commands as adminstrator.';
    step.all = function(state, done) {
      // Grab admin commands from state.
      var adminCommands = state.adminCommands;
      util.runAdminCmds(adminCommands, done);
    };
  });

};
