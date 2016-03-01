'use strict';

/*
 * This module is used to have a singleton instance of the Log class that can
 * be loaded directly from here or referenced as part of core.
 */

/*
 * Load Log class.
 */
var Log = require('../util/log.js');

/*
 * Create a singleton instance.
 */
var log = new Log();

/*
 * Register plugins.
 */
log.use(function(kind, message) {
  // Only check non status events so we don't get into an infinite loop, so
  // we don't get into an infinite loop, so we don't get into an infinite loop,
  // so we dont' get into an infinite loop.
  if (kind !== 'status') {
    // Update status when pulling an image.
    var images = message.match(/Pulling from (.*)/);
    if (images) {
      log.status('Pulling image %s.', images[1]);
    }
    // Update status based on some logging data.
    if (message.match(/Downloading .*boot2docker.iso/)) {
      log.status('Downloading ISO.');
    } else if (message.match(/Creating VirtualBox VM/)) {
      log.status('Creating VM.');
    } else if (message.match(/Starting the VM/)) {
      log.status('Starting VM.');
    } else if (message.match(/Provisioning with boot2docker/)) {
      log.status('Provisioning Docker.');
    }
  }
});

/*
 * Export singleton instance.
 */
module.exports = log;
