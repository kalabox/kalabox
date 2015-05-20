'use strict';

// Load a promise library.
var Promise = require('bluebird');

// Override the original nodeify function.
Promise.prototype.nodeify = function(callback) {

  // If callback is provided, ensure it's a function.
  if (callback && typeof callback !== 'function') {

    throw new Error('Invalid callback function: ' + callback);

  }

  // Then follow the default nodeify function by using alias.
  return this.asCallback(callback);

};

// Export the constructor.
module.exports = Promise;
