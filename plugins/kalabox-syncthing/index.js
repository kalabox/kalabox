'use strict';

module.exports = function(kbox) {
  // Load the install steps for this plugin.
  require('./lib/install.js')(kbox);
  // Load events for this plugin.
  require('./lib/events.js')(kbox);
  // Load the share engine
  require('./lib/share.js')(kbox);
};
