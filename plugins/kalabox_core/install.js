'use strict';

module.exports = function(kbox) {

  kbox.install.registerStep(function(step) {
    step.name = 'testing4';
    step.description = 'blahzay blah blahzay';
    step.deps.push('testing2');
    step.all.darwin = function(state) {
      state.testing4 = 'foobarbazz7';
      console.log(step.name);
    };
  });

};
