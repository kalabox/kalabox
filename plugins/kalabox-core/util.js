'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var async = require('async');
var chalk = require('chalk');
var _ = require('lodash');

module.exports = function(kbox) {

  var helpers = kbox.util.helpers;

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

  var outputContainers = function(app, done) {
    if (typeof app === 'function' && !done) {
      done = app;
      app = null;
    }

    var appName = null;
    if (app) {
      appName = app.name;
    }

    kbox.engine.list(appName, function(err, containers) {
      if (err) {
        done(err);
      } else {
        async.each(containers,
        function(container, next) {
          kbox.engine.info(container.id, function(err, info) {
            if (err) {
              next(err);
            } else {
              if (info) {
                var split = info.name.split('_');
                var isData = (split[2] === 'data') ? true : false;
                if (!isData) {
                  console.log(JSON.stringify(info, null, '  '));
                }
              }
              next();
            }
          });
        },
        function(err) {
          done(err);
        });
      }
    });
  };

  return {
    getAppStats: getAppStats,
    getAppContainers: getAppContainers,
    getAppNames: getAppNames,
    outputContainers: outputContainers
  };

};
