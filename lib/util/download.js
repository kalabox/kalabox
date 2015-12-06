'use strict';

/**
 * Kalabox download utility module.
 * @module kbox.util.download
 */

// Native modules
var path = require('path');

// Npm modules
var _ = require('lodash');
var hdiutil = require('dmg');
var fs = require('fs-extra');

// Kalabox modules
var Promise = require('../promise.js');
var internet = require('./internet.js');
var dmgLogger = require('../core.js').log.make('DMG');

/*
 * Mounts a DMG
 */
var mountDmg = function(dmg) {
  return Promise.fromNode(function(cb) {
    hdiutil.mount(dmg, cb);
  });
};

/*
 * Unmounts a DMG
 */
var unmountDmg = function(dmg) {
  return Promise.fromNode(function(cb) {
    hdiutil.unmount(dmg, cb);
  });
};

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

  // Start a collector of DMG files so we can extract them later
  var dmgs = [];

  // Set each URL depending on extension
  urls.forEach(function(url) {

    // Get some data
    var fileName = path.basename(url);
    var fileExt = path.extname(url);

    // Collect the dmg if approprirate
    if (fileExt === '.dmg') {
      dmgs.push(fileName);
    }

    // Add to the correct extract downloader
    if (_.includes(zippyExts, fileExt)) {
      downloadExtract.get(url);
    }

    // Or add to normal downloader
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

  // Promisify our download run and retry on failure
  .retry(function() {

    // Run through both our normal and extractable downloaders
    return Promise.each(downloaders, function(downloader) {

      // Download the files
      return Promise.fromNode(function(callback) {
        downloader.run(callback);
      });

    });
  })

  // Extract any DMG content if we need to
  .then(function() {

    // Iterate through our dmgs
    return Promise.each(dmgs, function(dmg) {

      // Build path to DMG
      var dmgPath = path.join(dest, dmg);
      dmgLogger.info('Mounting ' + dmgPath);

      // Mount the DMG
      return mountDmg(dmgPath)

      // Copy the content from the volume and unmount
      .then(function(volume) {
        dmgLogger.info('Mounted at ' + volume);

        // Copy application files or packages over
        _.forEach(fs.readdirSync(volume), function(file) {
          if (_.includes(['.pkg', '.app'], path.extname(file))) {
            var filePath = path.join(volume, file);
            dmgLogger.info('Extracting ' + filePath + ' to ' + dest);
            fs.copySync(filePath, path.join(dest, file));
          }
        });

        // Unmount DMG
        dmgLogger.info('Unmounting ' + volume);
        return unmountDmg(volume);
      });

    });

  });

};
