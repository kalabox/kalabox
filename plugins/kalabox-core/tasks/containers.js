'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var util = require('./../util.js')(kbox);

  // Display list of containers
  kbox.tasks.add(function(task) {
    task.path = ['containers'];
    task.description = 'Display list of all installed kbox containers.';
    task.func = function(done) {
      util.outputContainers(done);
    };
  });

  // Display more detailed list in app context
  kbox.whenAppRegistered(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'containers'];
      task.description =
        'Display list of application\'s installed containers.';
      task.func = function(done) {
        util.outputContainers(app, done);
      };
    });
  });

};
