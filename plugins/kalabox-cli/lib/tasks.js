'use strict';

/**
 * This is a wrapper to build cli commands when an app has a cli.yml file
 */

module.exports = function(kbox) {

  // Node
  var fs = require('fs');
  var path = require('path');

  // Npm
  var _ = require('lodash');

  kbox.whenAppRegistered(function(app) {

    // Check whether we should load these task or not
    var loadTasks = (app.config.pluginconfig.cli === 'on') ? true : false;

    // Load the tasks
    if (loadTasks) {

      // Cli tasks yml file
      var tasksFile = path.join(app.root, 'cli.yml');

      // Task defaults
      var taskDefaults = function() {
        return {
          binary: 'cli:/bin/sh',
          description: 'Run a command against a container'
        };
      };

      // Get run object
      // @todo: later

      // Check for our tasks and then generate tasks if we have a
      // file
      if (fs.existsSync(tasksFile)) {
        var tasks = kbox.util.yaml.toJson(tasksFile);

        _.forEach(tasks, function(data, cmd) {

          // Merge in default options
          var options = _.merge(taskDefaults(), data);

          // Build the command task
          kbox.tasks.add(function(task) {
            task.path = [app.name, cmd];
            task.category = 'appCmd';
            task.kind = 'delegate';
            task.description = options.description;
            task.func = function() {
              console.log('RUN!');
            };
          });

        });

      }
    }

  });

};
