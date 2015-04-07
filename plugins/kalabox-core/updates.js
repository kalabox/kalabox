'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var prompt = require('prompt');
var _ = require('lodash');

module.exports = function(kbox) {

  var helpers = kbox.util.helpers;
  var argv = kbox.core.deps.lookup('argv');
  var util = require('./util.js')(kbox);

  // Add common steps
  require('./steps/common.js')(kbox, 'update');

  // Authorize the update process
  kbox.update.registerStep(function(step) {
    step.name = 'kbox-auth';
    step.description = 'Authorizing update subroutines...';
    step.all = function(state, done) {
      prompt.override = argv;
      prompt.start();
      prompt.get({
        properties: {
          doit: {
            message: 'Are you sure you want to update Kalabox? (y/n)'.magenta,
            validator: /y[es]*|n[o]?/,
            warning: 'Must respond yes or no',
            default: 'no'
          }
        }
      },
      function(err, result) {
        if (result.doit.match(/y[es]*?/)) {
          done();
        }
        else {
          state.log('Fine, be that way!');
          process.exit(1);
        }
      });
    };
  });

  // Downloads.
  kbox.update.registerStep(function(step) {
    step.name = 'downloads';
    step.description = 'Download installation files.';
    step.deps = ['disk-space', 'internet', 'kbox-auth'];
    step.all = function(state, done) {
      // Grab downloads from state.
      var downloads = state.downloads;
      util.downloadFiles(downloads, done);
    };
  });

  // Authorize the update process
  // hide these until services and engine are done
  /*
  kbox.update.registerStep(function(step) {
    step.name = 'kbox-update';
    step.deps = ['kbox-auth'];
    step.description = 'Updating your Kalabox dependencies.';
    step.all = function(state, done) {
      kbox.util.npm.updateKalabox(function(err) {
        if (err) {
          done(err);
        }
        else {
          state.log('Updated kalabox deps!');
          done();
        }
      });
    };
  });

  // Authorize the update process
  // Separate this into services/engines
  kbox.update.registerStep(function(step) {
    step.name = 'kbox-backends';
    step.deps = ['kbox-auth'];
    step.description = 'Updating your Kalabox backends.';
    step.all = function(state, done) {
      kbox.util.npm.updateBackends(function(err) {
        if (err) {
          done(err);
        }
        else {
          state.log('Updated kalabox backends!');
          done();
        }
      });
    };
  });
  */

 // Preparing services for updates
  kbox.update.registerStep(function(step) {
    step.name = 'kbox-image-prepare';
    step.deps = ['engine-up'];
    step.description = 'Preparing services for updates.';
    step.all = function(state, done) {
      var sContainers = state.containers;
      util.prepareImages(sContainers, done);
    };
  });

  // stop running apps
  kbox.update.registerStep(function(step) {
    step.name = 'kbox-apps-prepare';
    step.subscribes = ['kbox-image-prepare'];
    step.deps = ['kbox-auth'];
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
                              state.log('Stopped ' + info.name);
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

};
