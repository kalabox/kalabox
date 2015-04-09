'use strict';

var chalk = require('chalk');
var fs = require('fs');
var path = require('path');

module.exports = function(kbox) {

  var util = require('./util.js')(kbox);
  var provisioned = kbox.core.deps.lookup('globalConfig').provisioned;
  var helpers = kbox.util.helpers;

  // Add common steps
  require('./steps/common.js')(kbox, 'install');

  // Run administator commands.
  kbox.install.registerStep(function(step) {
    step.name = 'core-run-admin-commands';
    step.deps = ['core-auth'];
    step.description = 'Running admin install commands...';
    step.all = function(state, done) {
      // Grab admin commands from state.
      var adminCommands = state.adminCommands;
      util.runAdminCmds(adminCommands, done);
    };
  });

  kbox.install.registerStep(function(step) {
    step.name = 'core-finish';
    step.description = 'Finishing install...';
    step.deps = ['core-auth'];
    step.all = function(state, done) {
      fs.writeFileSync(
        path.join(state.config.sysConfRoot, 'provisioned'),
        'true'
      );
      done();
    };
  });

  if (!provisioned) {
    kbox.install.registerStep(function(step) {
      step.name = 'core-prepare-usr-bin';
      step.description  = 'Preparing /usr/local/bin...';
      step.subscribes = ['core-run-admin-commands'];
      step.deps = ['core-auth'];
      step.all.linux = function(state, done) {
        var owner = [process.env.USER, process.env.USER].join(':');
        state.adminCommands.unshift('chown ' + owner + ' /usr/local/bin');
        if (!fs.existsSync('/usr/local/bin')) {
          state.adminCommands.unshift('mkdir -p /usr/local/bin');
        }
        done();
      };
    });
  }

  if (provisioned) {
    // Authorize the update process
    // hide these until services and engine are done
    kbox.install.registerStep(function(step) {
      step.name = 'core-update';
      step.deps = ['core-auth'];
      step.description = 'Updating your Kalabox dependencies...';
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
    kbox.install.registerStep(function(step) {
      step.name = 'core-backends';
      step.deps = ['core-auth'];
      step.description = 'Updating your Kalabox backends...';
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
    kbox.install.registerStep(function(step) {
      step.name = 'core-apps-prepare';
      step.deps = ['engine-up'];
      step.description = 'Preparing apps for updates...';
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
    kbox.install.registerStep(function(step) {
      step.name = 'core-image-prepare';
      step.deps = ['engine-up'];
      step.description = 'Preparing images for updates...';
      step.all = function(state, done) {
        util.prepareImages(state.containers, done);
      };
    });
  }

};
