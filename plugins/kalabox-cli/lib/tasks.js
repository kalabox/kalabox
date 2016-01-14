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
          services: ['cli'],
          entrypoint: '/bin/sh -c',
          description: 'Run a command against a container'
        };
      };

      /*
       * Return a run object
       */
      var getRun = function(options) {
        var cliFile = path.join(app.root, 'kalabox-cli.yml');
        return {
          compose: app.composeCore.concat([cliFile]),
          project: app.name,
          opts: {
            stdio: 'inherit',
            services: [options.service],
            entrypoint: options.entrypoint,
            cmd: options.cmd
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

              // Shift off our first cmd arg if its also the entrypoint
              // or the name of the command
              // @todo: this implies that our entrypoint should be in the path
              // and not constructed absolutely
              var payload = kbox.core.deps.get('argv').payload;
              if (options.entrypoint === payload[0] || options.stripfirst) {
                payload.shift();
              }

              // Set the payload to be the command
              options.cmd = payload;

              // If we have pre cmd opts then unshift them
              if (options.precmdopts) {
                options.cmd.unshift(options.precmdopts);
              }

              // If we have posrt cmd opts then unshift them
              if (options.postcmdopts) {
                options.cmd.push(options.postcmdopts);
              }

              // Get teh run definition objecti
              var runDef = getRun(options);

              // RUN IT!
              return kbox.engine.run(runDef);

            };
          });

        });

      }
    }

  });

};
