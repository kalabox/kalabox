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

  kbox.core.events.on('post-app-load', 9, function(app) {
    app.events.on('post-app-load', 9, function() {

      // Load the tasks.
      app.events.on('load-tasks', function() {

        // Load the tasks if the CLI plugin is on
        if (_.get(app.config.pluginconfig, 'cli') === 'on') {

          /*
           * Get omnibus commands
           */
          var getOmnibusCmd = function() {

            // Only do this if we have sharing set up correctly
            if (app.config.sharing.codeDir && app.config.sharing.share) {

              // Share dir
              var share = app.config.sharing.share.split(':') || ['', '/code'];

              return {
                service: 'cli',
                description: 'Run a system command like sudo, ls, rm, chown...',
                mapping: '<config.sharing.codeDir>:' + share[1],
                stripfirst: true
              };

            }
          };

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
                cmd: options.cmd,
                app: app
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

          /*
           * Helper to add a task
           */
          var addTask = function(cmd, options) {
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
                if (_.has(options, 'mapping')) {

                  // Resolve any path mappings that are in config
                  var dirs = _.map(options.mapping.split(':'), function(path) {
                    return getMappingProp(path);
                  });

                  // Get relevant directories so we can determine the correct
                  // working directory
                  var lSplit = path.join(app.root, dirs[0]).split(path.sep);
                  var pwdSplit = process.cwd().split(path.sep);
                  var diffDir = _.drop(pwdSplit, lSplit.length).join('/');
                  var workingDir = [dirs[1], diffDir].join('/');
                  app.env.setEnv('KALABOX_CLI_WORKING_DIR', workingDir);
                }

                // Shift off our first cmd arg if its also the entrypoint
                // or the name of the command
                // @todo: this implies that our entrypoint should be in the path
                // and not constructed absolutely
                var payload = kbox.core.deps.get('argv').payload;
                if (options.entrypoint === payload[0] ||
                    options.stripfirst) {
                  payload.shift();
                }

                // Set the payload to be the command,
                options.cmd = payload;

                // If we have pre cmd opts then unshift them
                // @todo: handle pre cmd opt array?
                if (options.precmdopts) {
                  if (typeof options.precmdopts === 'object') {
                    _.each(options.precmdopts.reverse(), function(opt) {
                      options.cmd.unshift(opt);
                    });
                  }
                  else {
                    options.cmd.unshift(options.precmdopts);
                  }
                }

                // If we have posrt cmd opts then unshift them
                // @todo: handle post cmd opt array?
                if (options.postcmdopts) {
                  if (typeof options.postcmdopts === 'object') {
                    _.each(options.postcmdopts.reverse(), function(opt) {
                      options.cmd.push(opt);
                    });
                  }
                  else {
                    options.cmd.push(options.postcmdopts);
                  }
                }

                // if an arg has spaces lets assume we need to wrap it in
                // quotes
                // @todo: this is probably a bad assumption
                options.cmd = _.map(options.cmd, function(arg) {
                  return (_.includes(arg, ' ')) ? '"' + arg + '"' : arg;
                });

                // Get teh run definition objecti
                var runDef = getRun(options);

                // RUN IT!
                return kbox.engine.run(runDef);

              };
            });
          };

          // Load the omnibus task
          addTask('.', _.merge(taskDefaults(), getOmnibusCmd()));

          // Go through our task files and load tasks if they exist
          _.forEach(app.taskFiles, function(taskFile) {

            // Check if task file actually exits
            if (fs.existsSync(taskFile)) {

              // Load tasks from the file
              var tasks = kbox.util.yaml.toJson(taskFile);

              // Go through each task in the taskfile and add them
              _.forEach(tasks, function(data, cmd) {
                addTask(cmd, _.merge(taskDefaults(), data));
              });
            }
          });
        }
      });
    });
  });

};
