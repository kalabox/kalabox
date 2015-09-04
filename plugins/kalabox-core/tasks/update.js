'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var util = require('./../util.js')(kbox);

  kbox.whenAppRegistered(function(app) {
    kbox.tasks.add(function(task) {
      task.category = 'appAction';
      task.path = [app.name, 'update'];
      task.description = 'Update an app, its plugins and containers.';
      task.func = util.createFrameworkFunc(task, kbox.update);
    });
  });

};
