'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  kbox.tasks.add(function(task) {
    task.path = ['env'];
    task.category = 'dev';
    task.description = 'Print Kalabox environmental vars.';
    task.func = function(done) {
      console.log(process.env);
      done();
    };
  });

};
