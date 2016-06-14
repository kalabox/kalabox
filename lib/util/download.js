/**
 * Kalabox download utility module.
 * @name download
 */

'use strict';

// Kalabox modules
var Promise = require('../promise.js');
var internet = require('./internet.js');

// Npm modules
var _ = require('lodash');

// Kalabox modules
var Promise = require('../promise.js');
var internet = require('./internet.js');
var kbox = require('../kbox.js');

/*
 * Plugin for downloads to give more control over setting status messages.
 */
var statuses = {};
function statusPlugin(res, url) {

  // Max display length of urls.
  var maxUrlLength = 40;

  // Create a new status.
  statuses[url] = {
    // Truncate right url.
    name: url.length > maxUrlLength ?
      '...' + url.slice(url.length - maxUrlLength) :
      url,
    url: url,
    // Grab total size of download from headers.
    total: res.headers['content-length'],
    // Set total bytes read to zero.
    read: 0,
    // Set percentage downloaded to zero.
    perc: 0
  };

  // Once a second set a recalculate flag, so our cpu doesn't go crazy.
  var recalcFlag = true;
  var timer = setInterval(function() {
    recalcFlag = true;
  }, 1000);

  // When new data is received.
  res.on('data', function(data) {
    // Keep track of new data being read.
    statuses[url].read += data.length;
    // If recalculate flag is set, recalculate everything for this status and
    // update status message using most interesting download.
    if (recalcFlag) {
      // Reset recalculate flag.
      recalcFlag = false;
      // Update percent downloaded for this download.
      statuses[url].perc = statuses[url].read > 0 ?
        _.round(statuses[url].read / statuses[url].total * 100, 1) :
        0;
      // Get most interesting download, which ever one is most complete.
      var mostInteresting = _
        .chain(_.values(statuses))
        .sortBy('perc')
        .last()
        .value();
      // Update status message with most interesting download.
      if (mostInteresting && mostInteresting.url === url) {
        kbox.core.log.status(
          'Downloading: [%s%%] %s',
          mostInteresting.perc,
          mostInteresting.name
        );
      }
    }
  });

  // When response ends, delete status for this download and clear recalc timer.
  res.on('end', function() {
    delete statuses[url];
    clearInterval(timer);
  });

}

/**
 * Downloads a bunch of files and extracts those as appropriate
 * @arg {Array} urls - Array of URLs to download.
 * @arg {error} dest - Where we want the downloads to end up
 * @example
 * kbox.util.download.downloadFiles()
 *
 * .then(function(files) {
 * });
 */
exports.downloadFiles = function(urls, dest) {

  // Moved these to inside the function so they will lazy load.
  var Download = require('download');
  var downloadExtract = new Download({extract: true});

  // Set each URL depending on extension
  urls.forEach(function(url) {
    downloadExtract.get(url);
  });

  // Set the destination and use the download progress
  // middleware and then arrayify before promosify
  downloadExtract.dest(dest).use(statusPlugin);

  // Check to make sure the Internet is accessable.
  return internet.check()

  // Promisify our download run and retry on failure
  .retry(function() {

    return Promise.fromNode(function(callback) {
      downloadExtract.run(callback);
    });

  });

};
