'use strict';

module.exports = function(kbox) {

  // Node
  var path = require('path');

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
  var start = function() {
    // Create container.
    return kbox.engine.start(syncthingService);
  };

  // Stop syncthing container.
  var stop = function() {
    // Stop container.
    return kbox.engine.stop(syncthingService);
  };

  return {
    isRunning: isRunning,
    isInstalled: isInstalled,
    start: start,
    stop: stop
  };

};
