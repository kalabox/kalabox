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

      /*
       * Return the task defaults
       */
      var taskDefaults = function() {
        return {
          binary: 'cli:/bin/sh',
          description: 'Run a command against a container'
        };
      };

      /*
       * Return a run object
       */
      var getRun = function(cmd) {
        var cliFile = path.join(app.root, 'kalabox-cli.yml');
        var parts = cmd.binary.split(':');
        return {
          compose: app.composeCore.concat([cliFile]),
          project: app.name,
          opts: {
            attach: true,
            service: parts[0],
            entrypoint: parts[1],
            cmd: cmd.cmd
          }
        };
      };

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
              var payload = kbox.core.deps.get('argv').payload;
              payload.shift();
              options.cmd = payload;
              var runDef = getRun(options);
              return kbox.engine.run(runDef);
            };
          });

        });

      }
    }

  });

};
