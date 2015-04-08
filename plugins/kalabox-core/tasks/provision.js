'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var util = require('./../util.js')(kbox);

  // Provision task.
  kbox.tasks.add(function(task) {
    task.path = ['provision'];
    task.description = 'Install kbox and it\'s dependencies.';
    task.func = util.createFrameworkFunc(task, kbox.install);
  });

};
