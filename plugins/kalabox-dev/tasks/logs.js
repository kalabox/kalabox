'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var util = require('../util.js')(kbox);

  kbox.whenAppRegistered(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'logs'];
      task.category = 'dev';
      task.description = 'Start an installed kbox application.';
      task.kind = 'argv1';
      task.func = function(done) {

        var target = this.payload[0];

        // Get a list of containers for this app.
        kbox.engine.list(app.name)
        // Filter those containers based on target.
        .filter(function(container) {
          return util.isContainerMatch(container, app.name, target);
        })
        // Make sure a container that matches was found.
        .then(function(containers) {
          if (containers.length > 0) {
            return containers[0];
          } else {
            throw new Error(kbox.util.format(
              'Could not find any containers matching "%s".', target
            ));
          }
        })
        // Query container's logs and output their contents.
        .then(function(container) {
          return kbox.engine.logs(container.id)
          .then(function(stream) {
            stream.pipe(process.stdout);
          });
        })
        // Return.
        .nodeify(done);

      };
    });
  });

};
