'use strict';

/**
 * Kalabox download utility module.
 * @module kbox.util.download
 */

// Native modules
var path = require('path');

// Npm modules
var _ = require('lodash');

// Kalabox modules
var Promise = require('../promise.js');
var internet = require('./internet.js');

/**
 * Downloads a bunch of files and extracts those as appropriate
 * @arg {array} urls - Array of URLs to download.
 * @arg {error} dest - Where we want the downloads to end up
 * @arg {vinyl} callback.files - Array of vinyl objects
 * @example
 * kbox.util.download.downloadFiles()
 *
 * .then(function(files) {
 * });
 */
exports.downloadFiles = function(urls, dest) {

  // Moved these to inside the function so they will lazy load.
  var Download = require('download');
  var progress = require('download-status');
  var downloadExtract = new Download({extract: true});
  var download = new Download({extract: false});

  // List of zippy extensions to check so we use the right
  // parser. We do this because download tries to extract
  // a DMG which doesnt go over so well
  var zippyExts = ['.7z', 'bz2', '.gzip', '.tar', '.tar.gz', '.tgz', '.zip'];

  // Set each URL depending on extension
  urls.forEach(function(url) {
    if (_.includes(zippyExts, path.extname(url))) {
      downloadExtract.get(url);
    }
    else {
      download.get(url);
    }
  });

  // Set the destination and use the download progress
  // middleware and then arrayify before promosify
  download.dest(dest).use(progress());
  downloadExtract.dest(dest).use(progress());
  var downloaders = [download, downloadExtract];

  // Check to make sure the Internet is accessable.
  return internet.check()

  // Promisify our download run
  .retry(function() {
    return Promise.each(downloaders, function(downloader) {
      return Promise.fromNode(function(callback) {
        downloader.run(callback);
      });
    });
  });

};
