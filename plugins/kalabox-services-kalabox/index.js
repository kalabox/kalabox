'use strict';

/**
 * Kalabox lib -> services -> kbox module.
 * @module kbox
 */

module.exports = function(kbox) {
  // Load events for this plugin.
  require('./lib/events.js')(kbox);
};
