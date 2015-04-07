'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var fs = require('fs');
var path = require('path');
var meta = require('./meta.js');
var mkdirp = require('mkdirp');
var Decompress = require('decompress');

module.exports = function(kbox) {

  var argv = kbox.core.deps.lookup('argv');
  var share = kbox.share;

  // Submitting services for updates
  kbox.update.registerStep(function(step) {
    step.name = 'syncthing-image-prepare';
    step.subscribes = ['kbox-image-prepare'];
    step.deps = ['kbox-auth'];
    step.description = 'Submitting syncthing image for update.';
    step.all = function(state, done) {
      state.containers.push('kalabox_syncthing');
      done();
    };
  });

  kbox.update.registerStep(function(step) {
    step.name = 'syncthing-image';
    step.deps = ['engine-prepared'];
    step.description = 'Updating your Syncthing services.';
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

  kbox.update.registerStep(function(step) {
    step.name = 'syncthing-off';
    step.deps = ['kbox-auth'];
    step.description = 'Making sure syncthing is not running';
    step.all = function(state, done) {
      share.getLocalSync()
      .then(function(localSync) {
        // Check if it's up
        return localSync.isUp()
        .then(function(isUp) {
          if (isUp) {
            // If it's up, then shut'er down.
            return localSync.shutdown();
          }
        });
      })
      .then(function() {
        done();
      })
      .catch(function(err) {
        done(err);
      });
    };
  });

  kbox.update.registerStep(function(step) {
    step.name = 'syncthing-download';
    step.deps = ['syncthing-off'];
    step.description = 'Downloading new syncthing things.';
    step.all = function(state, done) {
      // Grab downloads from state.
      var downloads = [];
      downloads.push(meta.SYNCTHING_DOWNLOAD_URL[process.platform]);
      downloads.push(meta.SYNCTHING_CONFIG_URL);
      // Validation.
      if (!Array.isArray(downloads)) {
        return done(new TypeError('Invalid downloads: ' + downloads));
      }
      downloads.forEach(function(download, index) {
        if (typeof download !== 'string' || download.length < 1) {
          done(new TypeError('Invalid download: index: ' + index +
            ' cmd: ' + download));
        }
      });
      // Download.
      if (downloads.length > 0) {
        state.downloadDir = kbox.util.disk.getTempDir();
        downloads.forEach(function(url) {
          state.log([url, state.downloadDir].join(' -> '));
        });
        var downloadFiles = kbox.util.download.downloadFiles;
        downloadFiles(downloads, state.downloadDir, function(err) {
          if (err) {
            state.log(state.status.notOk);
            done(err);
          } else {
            state.log(state.status.ok);
            done();
          }
        });
      } else {
        done();
      }
    };
  });

  // Setup syncthing.
  kbox.update.registerStep(function(step) {
    step.name = 'syncthing-update';
    step.description = 'Setup syncthing.';
    step.deps = ['syncthing-download'];
    // @todo: seperate out more
    step.all = function(state, done) {

      // Get the download location.
      var tmp = kbox.util.disk.getTempDir();

      // Move config from download location to the correct location.
      var syncthingDir = path.join(state.config.sysConfRoot, 'syncthing');
      mkdirp.sync(syncthingDir);
      var config = path.join(
        tmp,
        path.basename(meta.SYNCTHING_CONFIG_URL)
      );
      fs.renameSync(config, path.join(syncthingDir, path.basename(config)));

      // Install syncthing binary.
      var filename =
        path.basename(meta.SYNCTHING_DOWNLOAD_URL[process.platform]);
      var binary = path.join(tmp, filename);
      var decompress;
      if (process.platform === 'win32') {
        decompress = new Decompress({mode: '755'})
          .src(binary)
          .dest(tmp)
          .use(Decompress.zip());
      }
      else {
        decompress = new Decompress({mode: '755'})
          .src(binary)
          .dest(tmp)
          .use(Decompress.targz());
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
          var ext = (process.platform === 'win32') ? '.zip' : '.tar.gz';
          fs.renameSync(
            path.join(tmp, path.basename(binary, ext), bin),
            path.join(binDir, bin)
          );
          fs.chmodSync(path.join(binDir, bin), '0755');
          state.log(state.status.ok);
          done();
        }
      });

    };
  });

};
