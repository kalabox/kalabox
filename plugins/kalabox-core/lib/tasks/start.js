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

          // Print helpful stuff to the user after their app has started
          app.events.on('post-start', 9, function() {
            console.log(kbox.art.appStart(app));
          });

          return kbox.app.start(app);

        };
      });

    });

  });

};
