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
  var packed = kbox.core.deps.get('prepackaged');
  var provisioned = kbox.core.deps.get('globalConfig').provisioned;

  /*
   * We only need to turn syncthing off if we plan on updateing it
   */
  if (util.needsBinUp()) {
    kbox.install.registerStep(function(step) {
      step.name = 'syncthing-off';
      step.subscribes = ['syncthing-setup'];
      step.description = 'Making sure syncthing is not running...';
      step.all = function(state, done) {

        // Get the local syncthing instanced
        share.getLocalSync()

        // Check to see if it is running
        .then(function(localSync) {
          return localSync.isUp()

          // If it is then SHUT IT DOWNWWWW
          .then(function(isUp) {
            if (isUp) {
              return localSync.shutdown();
            }
          });
        })

        // Next step
        .nodeify(done);

      };
    });
  }

  /*
   * If we need to do updates or install syncthing for the first time
   * then run this step FOR SURE
   */
  if ((!packed || !provisioned) && util.needsDownloads()) {
    kbox.install.registerStep(function(step) {
      step.name = 'syncthing-downloads';
      step.description = 'Queuing up syncthing downloads...';
      step.subscribes = ['core-downloads'];
      step.all = function(state) {

        // We only need this if we need to update the local binary
        if (util.needsBinUp()) {
          state.downloads.push(meta.SYNCTHING_DOWNLOAD_URL[process.platform]);
        }

        // Grab new config if we need it
        if (util.needsConfig()) {
          state.downloads.push(meta.SYNCTHING_CONFIG_URL);
        }

      };
    });
  }

  /*
   * If we need to do updates then we will need to install our syncthing
   * binary again
   */
  if (util.needsBinUp()) {
    kbox.install.registerStep(function(step) {
      step.name = 'syncthing-setup';
      step.description = 'Setting up syncthing...';
      step.deps = ['core-downloads'];
      step.all = function(state) {

        // Install the syncthing binary
        util.installSyncthing(state.config.sysConfRoot);

        // Update our current install to reflect that
        state.updateCurrentInstall({SYNCTHING_BINARY: '0.11.25'});
        state.updateCurrentInstall({SYNCTHING_CONFIG: '0.10.0'});

      };
    });
  }

  /*
   * Add the new syncthing image to be pulled
   */
  if (util.needsImgUp()) {
    kbox.install.registerStep(function(step) {
      step.name = 'syncthing-image';
      step.subscribes = ['core-image-build'];
      step.description = 'Adding syncthing image to build list...';
      step.all = function(state) {

        // Adds in the images we need for syncthing
        state.images.push({name: 'syncthing'});
        state.images.push({name: 'data'});

      };
    });
  }

  /*
   * If we've got this far we can assume the syncthing image has been updated
   */
  if (util.needsImgUp()) {
    kbox.install.registerStep(function(step) {
      step.name = 'syncthing-image-verify';
      step.deps = ['core-image-build'];
      step.description = 'Updating install info...';
      step.all = function(state) {

        // Update the current install
        state.updateCurrentInstall({SYNCTHING_IMAGE: '0.11.25'});

      };
    });
  }

};
