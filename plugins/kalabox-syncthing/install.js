'use strict';

module.exports = function(kbox) {

  // Native modules
  var fs = require('fs');
  var path = require('path');

  // NPM modules
  var _ = require('lodash');

  // Kalabox modules
  var meta = require('./meta.js');
  var util = require('./util.js')(kbox);
  var share = kbox.share;

  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-downloads';
    step.description = 'Queuing up syncthing downloads...';
    step.subscribes = ['core-downloads'];
    step.deps = ['core-auth'];
    step.all = function(state) {
      if (!kbox.core.deps.get('prepackaged')) {
        state.downloads.push(meta.SYNCTHING_DOWNLOAD_URL[process.platform]);
        state.downloads.push(meta.SYNCTHING_CONFIG_URL);
      }
    };
  });
  /*

  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-setup';
    step.description = 'Setting up syncthing...';
    step.deps = ['core-downloads'];
    step.all = function(state, done) {
      util.installSyncthing(state.config.sysConfRoot, done);
    };
  });

  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-image';
    step.deps = ['engine-up'];
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
*/

};
