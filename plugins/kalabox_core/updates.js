'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var prompt = require('prompt');

module.exports = function(kbox) {

  var argv = kbox.core.deps.lookup('argv');

  // Authorize the update process
  kbox.update.registerStep(function(step) {
    step.name = 'update-auth';
    step.description = 'Authorizing update subroutines...';
    step.all = function(state, done) {
      //
      // Setting these properties customizes the prompt.
      //
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
    step.name = 'update-backends';
    step.deps = ['update-auth'];
    step.description = 'Updating your backend codes.';
    step.all = function(state, done) {
      kbox.util.npm.updateBackends(function(err) {
        if (err) {
          done(err);
        }
        else {
          done();
        }
      });
    };
  });

};
