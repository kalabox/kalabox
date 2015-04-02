'use strict';

module.exports = function(kbox) {

  // Load the install steps for this plugin.
  require('./install.js')(kbox);
  // Load CLI tasks for this plugin.
  require('./tasks.js')(kbox);
  // Load update steps
  require('./updates.js')(kbox);

};
