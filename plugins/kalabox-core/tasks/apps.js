'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var _ = require('lodash');
var async = require('async');

module.exports = function(kbox) {

  /*
   * Return a list of all the names of apps kbox knows about.
   */
  var getAppNames = function(callback) {

    // Get list of apps kbox knows about.
    kbox.app.list(function(err, apps) {

      if (err) {

        return callback(err);

      }

      // Map apps to a list of app names and sort.
      var appNames = _.map(apps, function(app) {
        return app.name;
      });
      appNames.sort();

      // Return app names.
      callback(null, appNames);

    });

  };

  /*
   * Return a list of containers for a given app name.
   */
  var getAppContainers = function(appName, callback) {

    // Get list of containers for this app name.
    kbox.engine.list(appName, function(err, containers) {

      if (err) {

        // Report any errors from getting list of containers.
        return callback(err);

      }

      // Map containers to container ids.
      var containerIds = _.map(containers, function(container) {
        return container.id;
      });

      // Map container ids to get more info from the container engine.
      async.map(containerIds, kbox.engine.info, function(err, containerInfos) {

        if (err) {

          // Report errors.
          return callback(err);

        }

        // Build info object to return.
        var info = {
          appName: appName,
          containerInfos: containerInfos
        };

        // Return info.
        callback(null, info);

      });

    });

  };

  // Display list of apps.
  kbox.tasks.add(function(task) {
    task.path = ['apps'];
    task.description = 'Display list of apps.';
    task.options.push({
      name: 'names',
      alias: 'n',
      description: 'Only display app names.'
    });
    task.func = function(done) {

      // Keep reference to this.
      var self = this;

      // Get sorted list of app names.
      getAppNames(function(err, appNames) {

        if (err) {

          // Report errors from getting app names.
          return done(err);

        }

        if (self.options.names) {

          // Only print out the app names.
          _.each(appNames, function(appName) {
            console.log(appName);
          });

          // Return.
          return done();

        }

        // Map app names to info about each apps containers.
        async.map(appNames, getAppContainers,
        function(err, appInfos) {

          if (err) {

            // Report any errors.
            return done(err);

          }

          // Loop through each app info.
          _.each(appInfos, function(appInfo) {

            var containerInfos = appInfo.containerInfos;

            // Reduce array of container infos to a stats object.
            var stats =
              _.reduce(containerInfos, function(stats, containerInfo) {

                // Increment running counter.
                if (containerInfo.running) {
                  stats.running += 1;
                }

                // Increment total counter.
                stats.total += 1;

                // Return stats.
                return stats;

              }, {app: appInfo.appName, running: 0, total: 0});

            // Output stats.
            console.log(stats);

          });

          // Task is done.
          done();

        });

      });

    };
  });

};
