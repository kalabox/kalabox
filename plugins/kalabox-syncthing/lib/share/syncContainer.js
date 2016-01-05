'use strict';

module.exports = function(kbox) {

  // Node
  var path = require('path');

  // var NPM
  //var fs = require('fs-extra');
  //var _ = require('lodash');

  // Kalabox
  var Promise = kbox.Promise;

  // Default compose definition
  var syncthingService = {
    compose: [path.resolve(__dirname, '..', '..', 'kalabox-compose.yml')],
    opts: {project: 'kalabox'}
  };
  var SERVICE_NAME = 'syncthing';

  // Set compose to know this is a service

  // Query engine to see if syncthing container exists.
  var isInstalled = function() {
    var checkFor = syncthingService;
    checkFor.opts.service = SERVICE_NAME;
    return kbox.engine.exists(checkFor);
  };

  // Query engine to see if syncthing container is running.
  var isRunning = function() {
    // Add the services to check for
    var checkFor = syncthingService;
    checkFor.opts.service = SERVICE_NAME;
    // Inspect.
    return kbox.engine.inspect(checkFor)
    // Return container's running status.
    .then(function(data) {
      return data.State.Running;
    });
  };

  // Create syncthing container.
  var create = function(binds) {

    kbox.core.log.info('SYNC CONTAINER => Binds', binds);

    // If we have binds we need to override our compose file
    /*
    if (!_.isEmpty(binds)) {

      // Create dir to store this stuff
      var tmpDir = path.join(kbox.util.disk.getTempDir(), SERVICE_NAME);
      fs.mkdirpSync(tmpDir);

      // Make sure our volumes are unique
      var newCompose = {
        syncthing: {
          volumes: _.uniq(binds)
        }
      };

      // Create the file
      var fileName = _.uniqueId(SERVICE_NAME + '-') + '.yml';
      var newComposeFile = path.join(tmpDir, fileName);
      kbox.util.yaml.toYamlFile(newCompose, newComposeFile);
      syncthingService.compose.push(newComposeFile);
    }
    */

    // Create container.
    return kbox.engine.start(syncthingService);

  };

  /*
   * Remove syncthing container.
   */
  var remove = function(counter) {

    // Set default counter.
    if (counter === undefined) {
      counter = 5;
    }

    var checkFor = syncthingService;
    checkFor.opts.service = SERVICE_NAME;
    // Inspect to get id.
    return kbox.engine.inspect(checkFor)
    // Remove container.
    .tap(function(data) {
      return kbox.engine.remove({cid: data.Id, opts: {v: false}});
    })
    // Check if the container is still installed.
    .then(function(data) {
      isInstalled({cid: data.Id});
    })
    // Keep trying until container is uninstalled or we run out of attempts.
    .then(function(isInstalled) {
      if (isInstalled) {
        if (counter > 0) {
          // Wait 3 seconds, then call this function again.
          return Promise.delay(3 * 1000)
          .then(function() {
            return remove(counter - 1);
          });
        } else {
          // We have run out of attempts, so throw an error.
          throw new Error('Could not remove syncthing container.');
        }
      }
    });

  };

  // Stop syncthing container.
  var stop = function() {
    // Stop container.
    return kbox.engine.stop(syncthingService);
  };

  return {
    isRunning: isRunning,
    isInstalled: isInstalled,
    create: create,
    start: create,
    remove: remove,
    stop: stop
  };

};
