'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var prompt = require('prompt');

var PROVIDER_ATTEMPTS = 3;

module.exports = function(kbox) {

  var argv = kbox.core.deps.lookup('argv');
  var helpers = kbox.util.helpers;

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

  // Authorize the update process
  kbox.update.registerStep(function(step) {
    step.name = 'kbox-update';
    step.deps = ['kbox-auth'];
    step.description = 'Updating your Kalabox backends.';
    step.all = function(state, done) {
      kbox.util.npm.updateKalabox(function(err) {
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

  // Shutdown running apps and containers
  // this should go in kalabox-engine-docker
  kbox.update.registerStep(function(step) {
    step.name = 'engine-prepare';
    step.deps = ['kbox-update'];
    step.description = 'Preparing engine for updates.';
    step.all = function(state, done) {
      kbox.engine.up(PROVIDER_ATTEMPTS, function(err) {
        if (err) {
          done(err);
        }
        else {
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
                    } else {
                      if (!info.running) {
                        done();
                      }
                      else {
                        if (info.app !== null) {
                          kbox.app.get(info.app, function(err, app) {
                            if (err) {
                              done(err);
                            }
                            else {
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
                          });
                        }
                        else {
                          kbox.engine.stop(info.id, function(err) {
                            if (err) {
                              done(err);
                            }
                            else {
                              kbox.engine.remove(info.id, function(err) {
                                if (err) {
                                  done(err);
                                }
                                else {
                                  state.log('Removed ' + info.name);
                                  done();
                                }
                              });
                            }
                          });
                        }
                      }
                    }
                  });
                },
                function(errs) {
                  if (err) {
                    done(err);
                  }
                  else {
                    kbox.engine.down(PROVIDER_ATTEMPTS, done);
                  }
                }
              );
            }
          });
        }
      });
    };
  });
};
