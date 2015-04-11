'use strict';

var chalk = require('chalk');
var fs = require('fs');
var path = require('path');

module.exports = function(kbox) {

  var util = require('./util.js')(kbox);
  var helpers = kbox.util.helpers;
  var provisioned = kbox.core.deps.lookup('globalConfig').provisioned;

  // Add common steps
  require('./steps/common.js')(kbox, 'install');

  // Run administator commands.
  kbox.install.registerStep(function(step) {
    step.name = 'core-run-admin-commands';
    if (provisioned) {
      step.deps = ['core-auth'];
    }
    if (!provisioned && process.platform === 'win32') {
      steps.deps.push('core-downloads');
    }
    step.description = 'Running admin install commands...';
    step.all = function(state, done) {
      // Grab admin commands from state.
      var adminCommands = state.adminCommands;
      util.runAdminCmds(adminCommands, done);
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

    kbox.install.registerStep(function(step) {
      step.name = 'core-finish';
      step.description = 'Finishing install...';
      // @todo: need core dep
      step.deps = ['services-kalabox-finalize'];
      step.all = function(state, done) {
        fs.writeFileSync(
          path.join(state.config.sysConfRoot, 'provisioned'),
          'true'
        );
        done();
      };
    });
  }

  if (provisioned) {
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

    kbox.install.registerStep(function(step) {
      step.name = 'core-image-prepare';
      step.deps = ['core-apps-prepare'];
      step.description = 'Preparing images for updates...';
      step.all = function(state, done) {
        util.prepareImages(state.containers, done);
      };
    });

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
                          if (info.running) {
                            kbox.app.stop(app, function(errs) {
                              if (errs) {
                                done(errs);
                              }
                              else {
                                state.log.info('Stopped ' + app.name);
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
  }
};
