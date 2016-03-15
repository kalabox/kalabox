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

    // Load the tasks if the CLI plugin is on
    if (_.get(app.config.pluginconfig, 'cli') === 'on') {

      /*
       * Map a mapping to a app config prop
       */
      var getMappingProp = function(prop) {
        if (_.startsWith(prop, '<') && _.endsWith(prop, '>')) {
          return _.get(app, _.trimRight(_.trimLeft(prop, '<'), '>'));
        }
        else {
          return prop;
        }
      };

      /*
       * Return a run object
       */
      var getRun = function(options) {
        return {
          compose: app.composeCore,
          project: app.name,
          opts: {
            mode: 'attach',
            services: [options.service],
            entrypoint: options.entrypoint,
            cmd: options.cmd
          }
        };
      };

      /*
       * Return the task defaults
       */
      var taskDefaults = function() {
        return {
          services: ['cli'],
          entrypoint: ['usermap'],
          description: 'Run a command against a container'
        };
      };

      // Assume the generic task file exists
      var taskFiles = [path.join(app.root, 'cli.yml')];

      // Allow other things to add task files
      return kbox.core.events.emit('cli-add-taskfiles', taskFiles)

      // Then load all the taskfiles up
      .then(function() {

        // Check for our tasks and then generate tasks if the file
        // exists
        _.forEach(taskFiles, function(taskFile) {

          if (fs.existsSync(taskFile)) {

            var tasks = kbox.util.yaml.toJson(taskFile);

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

                  // If our task has a working directory mapping specified lets set
                  // a working directory plus env so we have something to use to
                  // drop the user into the right location in the container to run
                  // their task
                  // @todo: clean this up so we only call env.setEnv once
                  if (_.has(data, 'mapping')) {

                    // Resolve any path mappings that are in config
                    var dirs = _.map(data.mapping.split(':'), function(path) {
                      return getMappingProp(path);
                    });

                    // Get relevant directories so we can determine the correct
                    // working directory
                    var lSplit = path.join(app.root, dirs[0]).split(path.sep);
                    var pwdSplit = process.cwd().split(path.sep);
                    var diffDir = _.drop(pwdSplit, lSplit.length).join('/');
                    var workingDir = [dirs[1], diffDir].join('/');
                    var env = kbox.core.env;
                    env.setEnv('KALABOX_CLI_WORKING_DIR', workingDir);
                  }

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
        });
      });
    }
  });

};
