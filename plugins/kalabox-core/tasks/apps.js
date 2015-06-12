'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var _ = require('lodash');
  var async = require('async');
  var Promise = kbox.Promise;

  /*
   * Return a list of all the names of apps kbox knows about.
   */
  var getAppNames = function() {

    // Get list of apps kbox knows about.
    return kbox.app.list()
    // Map apps to a list of app names and sort.
    .then(function(apps) {
      var appNames = _.map(apps, function(app) {
        return app.name;
      });
      appNames.sort();
      return appNames;
    });

  };

  /*
   * Return a list of containers for a given app name.
   */
  var getAppContainers = function(appName) {

    // Get list of containers for this app name.
    return kbox.engine.list(appName)
    // Map containers to container ids.
    .map(function(container) {
      return container.id;
    })
    // Map container ids to container infos.
    .map(function(containerId) {
      return kbox.engine.info(containerId);
    });

  };

  /*
   * Return an app stats object.
   */
  var getAppStats = function(appName) {

    // Starting object.
    var obj = {
      running: 0,
      total: 0
    };

    // Get app containers.
    return getAppContainers(appName)
    // Filter out data container.
    .filter(function(containerInfo) {
      var o = kbox.util.docker.containerName.parse(containerInfo.name);
      return o.name !== 'data';
    })
    // Reduce list of containers to a app stats object.
    .reduce(function(obj, containerInfo) {
      // Increment running.
      if (containerInfo.running) {
        obj.running += 1;
      }
      // Increment total.
      obj.total += 1;
      return obj;
    }, obj);

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

      // Keep refernece for later.
      var self = this;

      // Get list of app names.
      getAppNames()
      // Map app names to an object.
      .then(function(appNames) {
        if (self.options.names) {
          // Just return app names.
          return appNames;
        } else {
          // Reduce app names to an object of app stats.
          return Promise.reduce(appNames, function(obj, appName) {
            return getAppStats(appName)
            .then(function(stats) {
              obj[appName] = stats;
              return obj;
            });
          }, {});
        }
      })
      // Output object.
      .then(function(result) {
        console.log(JSON.stringify(result, null, '  '));
      })
      // Return.
      .nodeify(done);

    };
  });

};
