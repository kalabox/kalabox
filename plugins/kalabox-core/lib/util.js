'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var _ = require('lodash');

module.exports = function(kbox) {

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

  /*
   * Output a list of all our containers
   * if in an app we print out more data and only the apps containers
   * if we are not in an app we print out a summary of all containers
   */
  var outputContainers = function(app, done) {

    // Rejig the sig
    if (typeof app === 'function' && !done) {
      done = app;
      app = null;
    }

    // Set an app name if appropriate
    var appName = null;
    if (app) {
      appName = app.name;
    }

    // Get a list of all our things
    return kbox.engine.list(appName)

    // Iterate through each container
    .each(function(container) {

      // Get more info about each container
      return kbox.engine.info(container.id)

      // Take the info and print it out nicely
      .then(function(info) {
        if (info) {
          console.log(JSON.stringify(info, null, '  '));
        }
      });

    })

    // You complete me
    .nodeify(done);

  };

  return {
    getAppStats: getAppStats,
    getAppContainers: getAppContainers,
    getAppNames: getAppNames,
    outputContainers: outputContainers
  };

};
