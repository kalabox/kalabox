'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var argv = kbox.core.deps.lookup('argv');

  // @todo: remove
  kbox.update.registerStep(function(step) {
    step.name = 'foo2';
    step.description = step.name;
    step.all = function(state) {
      if (state.app) {
        console.log(state.app.name);
      }
      console.log(step.name);
    };
  });

};
