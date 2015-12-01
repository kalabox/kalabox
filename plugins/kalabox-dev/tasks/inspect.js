'use strict';

/**
 * This allows the user to inspect a bunch of meta data about a specific
 * container
 *
 * `kbox inspect [containername1 containername2 ...]`
 *
 */

var _ = require('lodash');

module.exports = function(kbox) {

  kbox.whenAppRegistered(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'inspect'];
      task.category = 'dev';
      task.description = 'Inspect containers.';
      task.kind = 'argv*';
      task.func = function(done) {

        // An array of the containers we want to inspect
        var targets = this.payload;

        // Get a list of our apps containers
        return kbox.engine.list(app.name)

        // An array of possible containers to inspect
        .then(function(containers) {

          // Get list of containers we want to inspect
          var inspects = _.map(targets, function(target) {

            // Check to see if one of our targets is also a container for
            // this app
            var result = _.find(containers, function(container) {
              return container.name === target;
            });

            // Return our result
            return result || [];

          });

          // Let the user know there are no containers to inspect
          if (_.isEmpty(inspects)) {
            console.log('Check you have entered the correct containers');
          }

          // Return the collected set of container to inspect
          return inspects;

        })

        // Print inspect data for each container
        .each(function(inspect) {

          // Grab more data for the target container
          return kbox.engine.inspect(inspect.id)

          // And then print that data
          .then(function(data) {
            console.log(data);
          });

        })

        // Complete
        .nodeify(done);

      };
    });
  });

};
