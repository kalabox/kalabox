'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var _ = require('lodash');

module.exports = function(kbox) {

  var helpers = kbox.util.helpers;
  var util = require('./util.js')(kbox);

  // Add common steps
  require('./steps/common.js')(kbox, 'update');

  // Authorize the update process
  // hide these until services and engine are done
  kbox.update.registerStep(function(step) {
    step.name = 'core-update';
    step.deps = ['core-auth'];
    step.description = 'Updating your Kalabox dependencies.';
    step.all = function(state, done) {
      kbox.util.npm.updateKalabox(function(err) {
        if (err) {
          done(err);
        }
        else {
          state.log.debug('Updated kalabox deps!');
          done();
        }
      });
    };
  });

  // Authorize the update process
  // Separate this into services/engines
  kbox.update.registerStep(function(step) {
    step.name = 'core-backends';
    step.deps = ['core-auth'];
    step.description = 'Updating your Kalabox backends.';
    step.all = function(state, done) {
      kbox.util.npm.updateBackends(function(err) {
        if (err) {
          done(err);
        }
        else {
          state.log.debug('Updated kalabox backends!');
          done();
        }
      });
    };
  });

  // stop running apps
  kbox.update.registerStep(function(step) {
    step.name = 'core-apps-prepare';
    step.deps = [
      'engine-docker-up'
    ];
    step.description = 'Preparing apps for updates.';
    step.all = function(state, done) {
      kbox.engine.list(function(err, containers) {
        if (err) {
          done(err);
        }
        else {
          helpers.mapAsync(
            containers,
            function(container, done) {
              kbox.engine.info(container.id, function(err, info) {
                if (err) {
                  done(err);
                }
                else {
                  if (info.app !== null) {
                    kbox.app.get(info.app, function(err, app) {
                      if (err) {
                        done(err);
                      }
                      else {
                        if (!info.running) {
                          kbox.app.stop(app, function(errs) {
                            if (errs) {
                              done(errs);
                            }
                            else {
                              state.log.debug('Stopped ' + app.name);
                              done();
                            }
                          });
                        }
                        else {
                          done();
                        }
                      }
                    });
                  }
                  else {
                    done();
                  }
                }
              });
            },
            function(errs) {
              if (err) {
                done(err);
              }
              else {
                done();
              }
            }
          );
        }
      });
    };
  });

 // Preparing services for updates
  kbox.update.registerStep(function(step) {
    step.name = 'core-image-prepare';
    step.description = 'Preparing services for updates.';
    step.all = function(state, done) {
      util.prepareImages(state.containers, done);
    };
  });

};
