'use strict';

module.exports = function(kbox) {
  // Load events for this plugin.
  require('./lib/events.js')(kbox);
  // Load tasks for ths plugin
  require('./lib/tasks.js')(kbox);
};
