'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  // Prints out the config.
  kbox.tasks.add(function(task) {
    task.path = ['config'];
    task.description = 'Display the kbox configuration.';
    task.func = function() {
      var config = kbox.core.config.getGlobalConfig();
      console.log(JSON.stringify(config, null, '  '));
    };
  });

  kbox.core.events.on('post-app-load', function(app) {
    app.events.on('load-tasks', function() {
      kbox.tasks.add(function(task) {
        task.path = [app.name, 'config'];
        task.category = 'appAction';
        task.description = 'Display the kbox application\'s configuration.';
        task.func = function() {
          console.log(JSON.stringify(app.config, null, '  '));
        };
      });
    });
  });

};
