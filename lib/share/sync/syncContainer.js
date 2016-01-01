'use strict';

var Promise = require('../../promise.js');
var kbox = require('../../kbox.js');

/*
 * Constants.
 */
var IMAGE_NAME = 'syncthing';
var CONTAINER_NAME = 'kalabox_syncthing';

// Query engine to see if syncthing container exists.
var isInstalled = exports.isInstalled = function() {
  return kbox.engine.exists(CONTAINER_NAME);
};

// Query engine to see if syncthing container is running.
exports.isRunning = function() {
  // Inspect.
  return kbox.engine.inspect({name: CONTAINER_NAME})
  // Return container's running status.
  .then(function(data) {
    return data.State.Running;
  });
};

// Create syncthing container.
exports.create = function(binds) {

  kbox.core.log.debug('SYNC CONTAINER => Binds', binds);

  var opts = {
    Image: IMAGE_NAME,
    name: CONTAINER_NAME,
    HostConfig: {
      Binds: binds,
      NetworkMode: 'bridge',
      PortBindings: {
        '60008/tcp': [{'HostIp': '', 'HostPort': '60008'}],
        '22000/tcp': [{'HostIp': '', 'HostPort': '22000'}],
        '21025/udp': [{'HostIp': '', 'HostPort': '21025'}],
        '21026/udp': [{'HostIp': '', 'HostPort': '21026'}]
      },
      VolumesFrom: ['kalabox_data']
    }
  };

  // Create container.
  return kbox.engine.create(opts);

};

/*
 * Remove syncthing container.
 */
var remove = exports.remove = function(counter) {

  // Set default counter.
  if (counter === undefined) {
    counter = 5;
  }

  // Remove container.
  return kbox.engine.remove({containerName: CONTAINER_NAME})
  // Check if the container is still installed.
  .then(isInstalled)
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
        throw new Error('Could not remove container ' + CONTAINER_NAME);
      }
    }
  });

};

// Start syncthing container.
exports.start = function(/*opts*/) {
  // Start container.
  return kbox.engine.start({cid: CONTAINER_NAME});
};

// Stop syncthing container.
exports.stop = function() {
  // Stop container.
  return kbox.engine.stop({cid: CONTAINER_NAME});
};
