'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var _ = require('lodash');

  kbox.tasks.add(function(task) {
    task.path = ['env'];
    task.description = 'Print Kalabox environmental vars.';
    task.func = function(done) {
      _.forEach(process.env, function(value, key) {
        if (_.startsWith(key, 'KALABOX')) {
          console.log([key, value].join('='));
        }
      });
      done();
    };
  });

};
