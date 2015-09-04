'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var _ = require('lodash');
  var Promise = require('bluebird');
  var format = require('util').format;

  kbox.whenAppRegistered(function(app) {

    kbox.tasks.add(function(task) {
      task.path = [app.name, 'terminal'];
      task.category = 'dev';
      task.description = 'Terminal into a container.';
      task.kind = 'argv1';
      task.func = function(done) {

        // CLI argument.
        var target = this.payload[0];

        // Get list of containers for this app.
        kbox.engine.list(app.name)
        // Filter containers that match target.
        .filter(function(container) {

          // Match target against container's id.
          var isContainerId = container.id === target;

          // Match target against container's name.
          var isContainerName = container.name === target;

          // Match target against component's name.
          var isComponentName = (function() {
            var o = kbox.util.docker.containerName.parse(container.name);
            return o.name === target;
          })();

          return isContainerId || isContainerName || isComponentName;

        })
        // If no containers matched, then throw an error.
        .then(function(containers) {
          if (containers.length > 0) {
            return _.head(containers);
          } else {
            throw new Error(format(
              'Could not find any containers matching "%s".', target
            ));
          }
        })
        // Terminal into container.
        .then(function(container) {
          return kbox.engine.terminal(container.id);
        })
        // Return.
        .nodeify(done);

      };
    });

  });

};
