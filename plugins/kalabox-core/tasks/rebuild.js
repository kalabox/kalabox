'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  kbox.whenAppRegistered(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'rebuild'];
      task.description = 'Rebuilds your app while maintaining your app data.';
      task.options.push({
        name: 'build-local',
        kind: 'boolean',
        description: 'Build images locally instead of pulling them remotely.'
      });
      task.func = function(done) {
        kbox.app.rebuild(app, done);
      };
    });
  });

};
