'use strict';

module.exports = function(kbox) {

  kbox.install.registerStep(function(step) {
    step.name = 'testing';
    step.description = 'blah blah blah blah';
    step.deps = ['testing3', 'testing2'];
    step.all.darwin = function(state) {
      console.log(step.name);
    };
  });

  kbox.install.registerStep(function(step) {
    step.name = 'testing2';
    step.description = 'yada yada ya';
    step.deps = [];
    step.all.darwin = function(state) {
      console.log(step.name);
    };
  });

  kbox.install.registerStep(function(step) {
    step.name = 'testing3' ;
    step.description = 'dfdfdsfsdf';
    step.deps.push('testing2');
    step.all = function(state) {
      console.log(step.name);
    };
  });

};
