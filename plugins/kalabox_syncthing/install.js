'use strict';

module.exports = function(kbox) {

  kbox.install.registerStep(function(step) {
    step.name = 'testing5';
    step.description = step.name;
    step.deps.push('testing4');
    step.all = function(state, done) {
      setTimeout(function() {
        console.log(step.name);
        console.log(state.testing4);
        done();
      }, 3 * 1000);
    };
  });

};
