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
        state.downloads.push(meta.SYNCTHING_DOWNLOAD_URL[process.platform]);
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
    // @todo: seperate out more
    step.all = function(state, done) {

      // Get the download location.
      var tmp = kbox.util.disk.getTempDir();

      // Move config from download location to the correct location.
      if (!state.syncthingConfigExists) {
        var syncthingDir = path.join(state.config.sysConfRoot, 'syncthing');
        mkdirp.sync(syncthingDir);
        var config = path.join(
          tmp,
          path.basename(meta.SYNCTHING_CONFIG_URL)
        );
        fs.renameSync(config, path.join(syncthingDir, path.basename(config)));
      }

      // Install syncthing binary.
      if (!state.isSyncthingInstalled) {
        var filename =
          path.basename(meta.SYNCTHING_DOWNLOAD_URL[process.platform]);
        var binary = path.join(tmp, filename);
        if (process.platform === 'win32') {
          var decompress = new Decompress({mode: '755'})
            .src(binary)
            .dest(tmp)
            .use(Decompress.targz());
        }
        else {
          var decompress = new Decompress({mode: '755'})
            .src(binary)
            .dest(tmp)
            .use(Decompress.zip());
        }
        decompress.run(function(err, files, stream) {
          if (err) {
            state.log(state.status.notOk);
            done(err);
          } else {
            var binDir = path.join(state.config.sysConfRoot, 'bin');
            mkdirp.sync(binDir);
            var bin =
              (process.platform === 'win32') ? 'syncthing.exe' : 'syncthing';
            fs.renameSync(
              path.join(tmp, path.basename(binary)),
              path.join(binDir, bin)
            );
            fs.chmodSync(path.join(binDir, bin), '0755');
            state.log(state.status.ok);
            done();
          }
        });
      } else {
        done();
      }

    };
  });

  // Install syncthing image.
  kbox.install.registerStep(function(step) {
    step.name = 'install-syncthing-image';
    step.description = 'Install syncthing image.';
    step.deps = ['init-engine'];
    step.all = function(state, done) {
      kbox.engine.build({name: 'kalabox/syncthing:stable'}, function(err) {
        if (err) {
          state.log(state.status.notOk);
          done(err);
        } else {
          state.log(state.status.ok);
          done();
        }
      });
    };
  });

};
