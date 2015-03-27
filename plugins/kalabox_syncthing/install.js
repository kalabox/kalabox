'use strict';

var fs = require('fs');
var path = require('path');
var meta = require('./meta.js');

module.exports = function(kbox) {

  // Is syncthing installed.
  kbox.install.registerStep(function(step) {
    step.name = 'is-syncthing-installed';
    step.description = 'Check if syncthing binary is installed.';
    step.all = function(state) {
      state.isSyncthingInstalled = fs.existsSync(
        path.join(state.config.sysConfRoot, 'bin', 'syncthing')
      );
      state.log('Syncthing installed?: ' + state.isSyncthingInstalled);
    };
  });

  // Syncthing config exists.
  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-config-exists';
    step.description = 'Check if syncthing config exists.';
    step.all = function(state) {
      state.syncthingConfigExists = fs.existsSync(
        path.join(state.config.sysConfRoot, 'syncthing', 'config.xml')
      );
      state.log('Syncthing config exists?: ' + state.syncthingConfigExists);
    };
  });

  // Gather syncthing dependencies.
  kbox.install.registerStep(function(step) {
    step.name = 'gather-syncthing-dependencies';
    step.description = 'Gathering syncthing dependencies.';
    step.deps = [
      'is-syncthing-installed',
      'syncthing-config-exists'
    ];
    step.subscribes = ['downloads'];
    step.all = function(state) {
      if (!state.isSyncthingInstalled) {
        state.downloads.push(meta.SYNCTHING_DOWNLOAD_URL);
      }
      if (!state.syncthingConfigExists) {
        state.downloads.push(meta.SYNCTHING_CONFIG_URL);
      }
    };
  });

};
