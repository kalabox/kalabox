'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  // Load CLI tasks.
  require('./tasks.js')(kbox);

};
