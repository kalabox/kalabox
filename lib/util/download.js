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
var log = require('../core.js').log.make('UTIL DOWNLOADS');

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

  /*
   * Helper function to map node platform to nw platform
   * @todo we assume x64 arch here
   */
  var getNwPlatform = function() {

    switch (process.platform) {
      case 'win32': return 'win64';
      case 'darwin': return 'osx64';
      case 'linux': return 'linux64';
    }

  };

  // Lets collect the removed urls
  var removed = [];

  // Start a collector of DMG files so we can extract them later
  var dmgs = [];

  // Moved these to inside the function so they will lazy load.
  var Download = require('download');
  var progress = require('download-status');
  var downloadExtract = new Download({extract: true});
  var download = new Download({extract: false});

  // Check for predownloaded files and copy them over if they exist
  // This only works in gui mode
  var depsRoot = path.resolve(process.cwd(), 'deps', getNwPlatform());

  // Check if we have a directory that might contain predownlaods
  if (fs.existsSync(depsRoot)) {

    // Let's go through our URLS and check if we already have this file
    urls.forEach(function(url) {

      // Source and destination dirs
      var source = path.join(depsRoot, path.basename(url));
      var write = path.join(dest, path.basename(url));

      // If the source exists write it to the dest and remove
      // from the downloads array
      // @todo: something async so we can error check?
      // @todo: what about files that need extraction?
      if (fs.existsSync(source)) {
        fs.writeFileSync(write, fs.readFileSync(source));

        // Indicate this is a DMG so we know to extract it later
        if (path.extname(url) === '.dmg') {
          dmgs.push(path.basename(url));
        }

        // Url to remove array
        removed.push(url);
      }

    });
  }

  // Set each URL depending on extension
  _.xor(urls, removed).forEach(function(url) {

    // Get some data
    var fileName = path.basename(url);
    var fileExt = path.extname(url);

    // Collect the dmg if approprirate and use the normal
    // downloader because weird things happen when we try to extract a dmg
    if (fileExt === '.dmg') {
      dmgs.push(fileName);
      download.get(url);
    }

    // All other downloads should run through the extractor
    else {
      downloadExtract.get(url);
    }

  });

  // Set the destination and use the download progress
  // middleware and then arrayify before promosify
  download.dest(dest).use(progress());
  downloadExtract.dest(dest).use(progress());

  // Check to make sure the Internet is accessable.
  return internet.check()

  // Promisify our download run and retry on failure
  .retry(function() {

    // Helper promise for our downloaders
    // NOTE: for some reason iterating through the downloaders
    // in a promise.each or map kills the whole process
    var downloadPromise = function(downloader) {
      return Promise.fromNode(function(callback) {
        downloader.run(callback);
      });
    };

    // Try to download with both downloaders
    return Promise.all([
      downloadPromise(download),
      downloadPromise(downloadExtract)
    ]);

  })

  // Extract any DMG content if we need to
  .then(function() {

    // Iterate through our dmgs
    return Promise.each(dmgs, function(dmg) {

      // Build path to DMG
      var dmgPath = path.join(dest, dmg);
      log.debug('Mounting ' + dmgPath);

      // Mount the DMG
      return mountDmg(dmgPath)

      // Copy the content from the volume and unmount
      .then(function(volume) {
        log.debug('Mounted at ' + volume);

        // Copy application files or packages over
        _.forEach(fs.readdirSync(volume), function(file) {
          if (_.includes(['.pkg', '.app'], path.extname(file))) {
            var filePath = path.join(volume, file);
            log.debug('Extracting ' + filePath + ' to ' + dest);
            fs.copySync(filePath, path.join(dest, file));
          }
        });

        // Unmount DMG
        log.debug('Unmounting ' + volume);
        return unmountDmg(volume);
      });

    });

  });

};
