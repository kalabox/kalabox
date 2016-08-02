'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  kbox.core.events.on('post-app-load', function(app) {

    app.events.on('load-tasks', function() {

      kbox.tasks.add(function(task) {
        task.path = [app.name, 'stop'];
        task.category = 'appAction';
        task.description = 'Stop a running kbox application.';
        task.func = function() {

          // Node modules
          var format = require('util').format;
          var chalk = require('chalk');
          var log = kbox.core.log;

          // Check to see if app is already running
          return kbox.app.isRunning(app)

          // Stop if running, otherwise inform user
          .then(function(isRunning) {
            if (isRunning) {
              return kbox.app.stop(app)
              .then(function() {
                log.status(chalk.yellow(format('App %s stopped', app.name)));
              });
            }
            else {
              log.warn(format('App %s already stopped.', app.name));
            }
          });

        };
      });

    });

  });

};
