'use strict';

var fs = require('fs');
var path = require('path');
var meta = require('./meta.js');
var mkdirp = require('mkdirp');
var Decompress = require('decompress');

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

  // Setup syncthing.
  kbox.install.registerStep(function(step) {
    step.name = 'setup-syncthing';
    step.description = 'Setup syncthing.';
    step.deps = ['downloads'];
    step.all = function(state, done) {

      // Get the download location.
      var tmp = kbox.util.disk.getTempDir();

      // Move config from download location to the correct location.
      if (!state.syncthingConfigExists) {
        var syncthingDir = path.join(state.config.sysConfRoot, 'syncthing');
        mkdirp.sync(syncthingDir);
        var config = path.join(tmp, path.basename(meta.SYNCTHING_CONFIG_URL));
        fs.renameSync(config, path.join(syncthingDir, path.basename(config)));
      }

      // Install syncthing binary.
      if (!state.isSyncthingInstalled) {
        var filename = path.basename(meta.SYNCTHING_DOWNLOAD_URL);
        var binary = path.join(tmp, filename);
        var decompress = new Decompress({mode: '755'})
          .src(binary)
          .dest(tmp)
          .use(Decompress.targz());

        decompress.run(function(err, files, stream) {
          if (err) {
            state.log(state.status.notOk);
            done(err);
          } else {
            var binDir = path.join(state.config.sysConfRoot, 'bin');
            mkdirp.sync(binDir);
            fs.renameSync(
              path.join(tmp, path.basename(binary, '.tar.gz'), 'syncthing'),
              path.join(binDir, 'syncthing')
            );
            fs.chmodSync(path.join(binDir, 'syncthing'), '0755');
            state.log(state.status.ok);
            done();
          }
        });
      } else {
        done();
      }

    };
  });

};
