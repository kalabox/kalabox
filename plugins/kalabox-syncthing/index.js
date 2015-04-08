'use strict';

module.exports = function(kbox) {

  // Load the install steps for this plugin.
  //require('./install.js')(kbox);
  // Load events for this plugin.
  require('./events.js')(kbox);
  // Load update steps
  //require('./updates.js')(kbox);

};
