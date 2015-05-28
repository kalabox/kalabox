'use strict';

var fs = require('fs');
var path = require('path');
var meta = require('./meta.js');
var _ = require('lodash');

module.exports = function(kbox) {

  var util = require('./util.js')(kbox);
  var provisioned = kbox.core.deps.lookup('globalConfig').provisioned;
  var share = kbox.share;

  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-downloads';
    step.description = 'Queuing up syncthing downloads...';
    step.subscribes = ['core-downloads'];
    step.deps = ['core-auth'];
    step.all = function(state) {
      state.downloads.push(meta.SYNCTHING_DOWNLOAD_URL[process.platform]);
      state.downloads.push(meta.SYNCTHING_CONFIG_URL);
    };
  });

  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-setup';
    step.description = 'Setting up syncthing...';
    step.deps = ['core-downloads'];
    step.all = function(state, done) {
      util.installSyncthing(state.config.sysConfRoot, done);
    };
  });

  var engineDep = (provisioned) ? 'engine-docker-prepared' : 'engine-up';
  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-image';
    step.deps = [engineDep];
    step.description = 'Installing your Syncthing image...';
    step.all = function(state, done) {
      kbox.engine.build({name: 'syncthing'}, function(err) {
        if (err) {
          state.status = false;
          done(err);
        } else {
          done();
        }
      });
    };
  });

  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-off';
    step.deps = ['core-auth'];
    step.description = 'Making sure syncthing is not running...';
    step.all = function(state, done) {
      share.getLocalSync()
      .then(function(localSync) {
        return localSync.isUp()
        .catch(function(err) {
          if (_.startsWith(err.message, '404 page not found')) {
            return localSync.isUpVersion10()
            .then(function(isUpVersion10) {
              if (isUpVersion10) {
                return localSync.shutdownVersion10();
              }
            });
          } else {
            return err;
          }
        })
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

  if (provisioned) {

    kbox.install.registerStep(function(step) {
      step.name = 'syncthing-image-prepare';
      step.subscribes = ['core-image-prepare'];
      step.deps = ['core-auth'];
      step.description = 'Submitting syncthing image for update...';
      step.all = function(state, done) {
        state.containers.push('kalabox_syncthing');
        done();
      };
    });

  }

};
