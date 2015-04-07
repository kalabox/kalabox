'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var util = require('./../util.js')(kbox);

  // Update task.
  kbox.tasks.add(function(task) {
    task.path = ['update'];
    task.description = 'Update kbox and it\'s dependencies.';
    task.func = util.createFrameworkFunc(kbox.update);
  });

  kbox.whenApp(function(app) {
    // Update task.
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'update'];
      task.description = 'Update application and it\'s dependencies.';
      task.func = util.createFrameworkFunc(kbox.update);
    });
  });

};
