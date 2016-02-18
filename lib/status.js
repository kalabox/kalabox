/**
 * Class for abstracting out a status message for whatever kalabox is doing
 * right now in a granular specific way so cli and gui users will have better
 * feedback.
 *
 * @name status
 */

'use strict';

/*
 * Implementing this as a class, so that once we have multiple app states in
 * memory, each can their own status message as well as core.
 */

// NPM modules.
var _ = require('lodash');

// Node modules.
var events = require('events');
var util = require('util');

// Kalabox modules.
var Promise = require('./promise.js');

/*
 * Constructor.
 */
function Status() {
  if (this instanceof Status) {
    // Default message to null.
    this.message = null;
    // Init promise chain.
    this.promiseChain = Promise.resolve();
    // Init promise chain depth.
    this.promiseChainDepth = 0;
    // Call event emitter's constructor.
    events.EventEmitter.call(this);
  } else {
    return new Status();
  }
}
/*
 * Inherit from event emitter.
 */
util.inherits(Status, events.EventEmitter);

/*
 * Update kalabox status message.
 */
Status.prototype.update = function() {
  var self = this;
  // Convert arguments to an array.
  var args = _.toArray(arguments);
  // Use util format so place holders can be used in strings.
  var message = util.format.apply(null, args);
  // Increment number of messages in queue.
  self.promiseChainDepth += 1;
  // Add to the promise chain.
  self.promiseChain = self.promiseChain.then(function() {
    // Emit update message.
    return Promise.try(function() {
      self.emit('update', {
        message: message
      });
    })
    .then(function() {
      // Calculate how long to delay based on queued messages.
      var delay = self.promiseChainDepth < 5 ?
        1000 :
        1000 / self.promiseChainDepth;
      // Delay to smooth things out.
      return Promise.delay(delay);
    })
    // Smooth out updates with a delay before the next update.
    .finally(function() {
      // Decrement number of messages in queue.
      self.promiseChainDepth -= 1;
    })
    // Ignore errors.
    .catch(function() {});
  });
};

/*
 * Temporary fix to have more granular feedback in the GUI. Logging
 * data is fed into this function.
 */
Status.prototype.fromLog = function(data) {

  // Update status when pulling an image.
  var images = data.match(/Pulling from (.*)/);
  if (images) {
    this.update('Pulling image %s.', images[1]);
  }

  // Update status based on some logging data.
  if (data.match(/Downloading .*boot2docker.iso/)) {
    this.update('Downloading ISO.');
  } else if (data.match(/Creating VirtualBox VM/)) {
    this.update('Creating VM.');
  } else if (data.match(/Starting the VM/)) {
    this.update('Starting VM.');
  } else if (data.match(/Provisioning with boot2docker/)) {
    this.update('Provisioning Docker.');
  }

};

/*
 * End status message to clear it.
 */
Status.prototype.end = function() {
  this.update();
};

/*
 * Export constructor.
 */
module.exports = Status;
