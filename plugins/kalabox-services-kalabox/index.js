'use strict';

/**
 * Kalabox lib -> services -> kbox module.
 * @module kbox
 */

module.exports = function(kbox) {

    // Load the install steps for this plugin.
  require('./lib/install.js')(kbox);
  // Load events for this plugin.
  require('./lib/events.js')(kbox);

};
