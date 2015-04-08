'use strict';

var fs = require('fs');
var path = require('path');
var meta = require('./meta.js');
var mkdirp = require('mkdirp');
var Decompress = require('decompress');

module.exports = function(kbox) {

  var util = require('./util.js')(kbox);

  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-is-syncthing-installed';
    step.description = 'Check if syncthing binary is installed.';
    step.deps = ['core-auth'];
    step.all = function(state) {
      var bin =
        (process.platform === 'win32') ? 'syncthing.exe' : 'syncthing';
      state.isSyncthingInstalled = fs.existsSync(
        path.join(state.config.sysConfRoot, 'bin', 'syncthing')
      );
      state.log.debug('Syncthing installed?: ' + state.isSyncthingInstalled);
    };
  });

  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-config-exists';
    step.description = 'Check if syncthing config exists.';
    step.deps = ['core-auth'];
    step.all = function(state) {
      state.syncthingConfigExists = fs.existsSync(
        path.join(state.config.sysConfRoot, 'syncthing', 'config.xml')
      );
      state.log.debug('Syncthing config?: ' + state.syncthingConfigExists);
    };
  });

  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-gather-syncthing-dependencies';
    step.description = 'Gathering syncthing dependencies.';
    step.deps = [
      'syncthing-is-syncthing-installed',
      'syncthing-config-exists'
    ];
    step.subscribes = ['core-downloads'];
    step.all = function(state) {
      if (!state.isSyncthingInstalled) {
        state.downloads.push(meta.SYNCTHING_DOWNLOAD_URL[process.platform]);
      }
      if (!state.syncthingConfigExists) {
        state.downloads.push(meta.SYNCTHING_CONFIG_URL);
      }
    };
  });

  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-setup-syncthing';
    step.description = 'Setup syncthing.';
    step.deps = [
      'core-downloads'
    ];
    step.all = function(state, done) {
      if (!state.syncthingConfigExists && !state.isSyncthingInstalled) {
        util.installSyncthing(state.config.sysConfRoot, done);
      }
      else {
        done();
      }
    };
  });

  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-install-syncthing-image';
    step.description = 'Install syncthing image.';
    step.deps = [
      'engine-docker-init-engine'
    ];
    step.all = function(state, done) {
      kbox.engine.build({name: 'kalabox/syncthing:stable'}, function(err) {
        if (err) {
          state.status = false;
          done(err);
        } else {
          done();
        }
      });
    };
  });

};
