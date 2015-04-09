'use strict';

var fs = require('fs');
var path = require('path');
var meta = require('./meta.js');
var mkdirp = require('mkdirp');
var Decompress = require('decompress');

module.exports = function(kbox) {

  var util = require('./util.js')(kbox);

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

  kbox.install.registerStep(function(step) {
    step.name = 'syncthing-install-image';
    step.description = 'Installing syncthing image...';
    step.deps = [
      'engine-docker-up'
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
