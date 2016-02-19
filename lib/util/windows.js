/**
 * Kalabox module for getting deeper windows info
 * @name windows
 */

'use strict';

var os = require('os');

/**
 * Return the "flavor" of windows aka 7, 8, 8.1 10 or OTHER
 */
exports.getFlavor = function() {

  // Grab our release data and split it into a version array
  var release = os.release();
  var releaseData = release.split('.');

  // Windows 10
  if (releaseData[0] === '10') {
    return '10';
  }
  // Windows 7, 8, and 8.1
  else if (releaseData[0] === '6') {
    switch (releaseData[1]) {
      // Windows 7
      case '1': return '7';
      // Windows 8
      case '2': return '8';
      // Windows 8.1
      case '3': return '8.1';
    }
  }
  // Unsupported
  else {
    return 'unsupported';
  }

};
