'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  // Instrinsic modules
  var fs = require('fs');
  var path = require('path');

  // Kalabox mods
  var util = require('./../util.js')(kbox);
  var Promise = kbox.Promise;
  var events = kbox.core.events.context();

  kbox.whenAppRegistered(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'stop'];
      task.category = 'appAction';
      task.description = 'Stop a running kbox application.';
      task.func = function(done) {

        // Turn the engine off if after an app start we don't have any
        // other apps running. Set a sufficiently high prioirty so that it
        // runs after all other events. We want this even to fire only
        // when you run the kbox stop command so it doesnt mess with other
        // commands like kbox restart or kbox destroy.
        events.on('post-app-stop', 9, function(app, done) {

          // Get list of app names.
          util.getAppNames()
          // Map app names to an object.
          .then(function(appNames) {
            // Reduce app names to an object of app stats.
            return Promise.reduce(appNames, function(obj, appName) {
              return util.getAppStats(appName)
              .then(function(stats) {
                if (stats.running > 0) {
                  return stats;
                }
              });
            }, {});
          })

          .then(function(result) {
            // Turn off the engine if we dont have any running apps
            if (result === undefined || result.running < 0) {
              // check for lock engine lock file
              var sysRoot = kbox.core.deps.get('globalConfig').sysConfRoot;
              if (!fs.existsSync(path.join(sysRoot, 'engine.lock'))) {
                return kbox.engine.down();
              }
            }
          })

          .nodeify(done);

        });

        // Actually stop the app
        kbox.app.stop(app, done);

      };
    });
  });

};
