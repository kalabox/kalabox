'use strict';

var rmdir = require('rimraf');
var fs = require('fs-extra');
var path = require('path');

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var events = kbox.core.events;
  var Promise = kbox.Promise;
  var util = require('./../util.js')(kbox);

  kbox.whenAppRegistered(function(app) {

    kbox.tasks.add(function(task) {
      task.path = [app.name, 'destroy'];
      task.category = 'appAction';
      task.description = 'Completely destroys and removes an app.';
      task.func = function(done) {

        // Stop the app if its running
        // @todo: what would this do on the GUI?
        events.on('pre-uninstall', 1, function(app, done) {

          // Keep refernece for later.
          var self = this;

          // Get list of app names.
          util.getAppContainers(app.name)
          // Map app names to an object.
          .then(function(containers) {
            // Reduce app names to an object of app stats.
            return Promise.reduce(containers, function(result, container) {
              return result || container.running;
            });
          })

          .then(function(appIsRunning) {
            // Turn off the engine if we dont have any running apps
            if (appIsRunning) {
              return kbox.app.stop(app);
            }
          })

          .nodeify(done);

        });

        // Remove the data container and the code directory
        // @todo: what would this do on the GUI?
        events.on('pre-uninstall', 2, function(app, done) {

          /*
           * Helper method to promisigy fs.exists
           */
          var existsAsync = function() {
            return new Promise(function(exists) {
              fs.exists(containerIdFile, exists);
            });
          };

          var containerIdFile = path.join(app.config.appCidsRoot, 'data');

          // Check to see if we have a data container to remove
          return existsAsync()

          // If it does we need to remove the container
          .then(function(exists) {
            if (exists) {
              var containerId = fs.readFileSync(containerIdFile, 'utf8');
              // Clean up the container ID file
              fs.unlinkSync(containerIdFile);
              // Remove the data container
              return kbox.engine.remove(containerId);
            }
          })

          // Remove our code directory
          // @todo: user kbox.log
          .then(function() {
            console.log('Removing the codez.');
            return Promise.fromNode(function(done) {
              rmdir(app.config.codeRoot, done);
            });
          })

          .nodeify(done);

        });

        // Actually do the uninstall
        kbox.app.uninstall(app, done);
      };
    });

  });

};
