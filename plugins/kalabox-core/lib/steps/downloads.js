'use strict';

/**
 * This contains some helpers to the download step
 */

module.exports = function(/*kbox*/) {

  /*
   * Validate that our downloads are all good and proper
   */
  var validateDownloads = function(downloads) {

    // Are the downloads an array?
    if (!Array.isArray(downloads)) {
      return 'Invalid download array: ' + JSON.stringify(downloads);
    }

    // Make sure each element of the array is a string
    downloads.forEach(function(download, index) {
      if (typeof download !== 'string' || download.length < 1) {
        return 'Invalid download: index: ' + index + ' cmd: ' + download;
      }
    });

    // Nope! WE GOOD!
    return true;

  };

  return {
    validate: validateDownloads
  };

};
