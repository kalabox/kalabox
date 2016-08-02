'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  kbox.core.events.on('post-app-load', function(app) {

    app.events.on('load-tasks', function() {

      kbox.tasks.add(function(task) {
        task.path = [app.name, 'start'];
        task.category = 'appAction';
        task.description = 'Start an installed kbox application.';
        task.func = function() {

          // Node modules
          var format = require('util').format;
          var log = kbox.core.log;

          // Check to see if app is already running
          return kbox.app.isRunning(app)

          // Start if not running, otherwise inform user
          .then(function(isRunning) {
            if (!isRunning) {
              return kbox.app.start(app)
              .then(function() {
                console.log(kbox.art.appStart(app));
              });
            }
            else {
              log.warn(format('App %s already running.', app.name));
            }
          });

        };
      });

    });

  });

};
