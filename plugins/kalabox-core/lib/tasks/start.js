'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var events = kbox.core.events.context();

  kbox.whenAppRegistered(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'start'];
      task.category = 'appAction';
      task.description = 'Start an installed kbox application.';
      task.func = function(done) {

        // Print helpful stuff to the user after their app has started
        events.on('post-app-start', 9, function(app, done) {
          console.log(kbox.art.appStart(app));
          done();
        });

        kbox.app.start(app, done);
      };
    });
  });

};
