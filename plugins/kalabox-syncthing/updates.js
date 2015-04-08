'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var meta = require('./meta.js');

module.exports = function(kbox) {

  var argv = kbox.core.deps.lookup('argv');
  var share = kbox.share;
  var util = require('./util.js')(kbox);

  kbox.update.registerStep(function(step) {
    step.name = 'syncthing-image-prepare';
    step.subscribes = ['core-image-prepare'];
    step.description = 'Submitting syncthing image for update.';
    step.all = function(state, done) {
      state.containers.push('kalabox_syncthing');
      done();
    };
  });

  kbox.update.registerStep(function(step) {
    step.name = 'syncthing-image';
    step.deps = ['engine-docker-prepared'];
    step.description = 'Updating your Syncthing services.';
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

  kbox.update.registerStep(function(step) {
    step.name = 'syncthing-off';
    step.deps = ['core-auth'];
    step.description = 'Making sure syncthing is not running';
    step.all = function(state, done) {
      share.getLocalSync()
      .then(function(localSync) {
        return localSync.isUp()
        .then(function(isUp) {
          if (isUp) {
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
    step.subscribes = ['core-downloads'];
    step.deps = ['core-auth'];
    step.description = 'Downloading new syncthing things.';
    step.all = function(state, done) {
      // Grab downloads from state.
      state.downloads.push(meta.SYNCTHING_DOWNLOAD_URL[process.platform]);
      state.downloads.push(meta.SYNCTHING_CONFIG_URL);
      // @todo: add error handling and better output
      done();
    };
  });

  // Setup syncthing.
  kbox.update.registerStep(function(step) {
    step.name = 'syncthing-update';
    step.description = 'Updating syncthing.';
    step.deps = [
      'core-downloads'
    ];
    step.all = function(state, done) {
      util.installSyncthing(state.config.sysConfRoot, done);
    };
  });

};
