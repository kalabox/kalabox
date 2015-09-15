'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  // Npm modules
  var chalk = require('chalk');

  // Disk space.
  kbox.install.registerStep(function(step) {
    step.name = 'core-disk-space';
    step.description = 'Checking for available disk space...';
    step.deps = ['core-auth'];
    step.all.darwin = function(state, done) {
      kbox.util.disk.getFreeSpace(function(err, freeMbs) {
        if (err) {
          done(err);
        } else {
          var enoughFreeSpace = freeMbs > (1 * 1000);
          if (!enoughFreeSpace) {
            err = new Error('Not enough disk space for install!');
          }
          done(err);
        }
      });
    };
    step.all.linux = step.all.darwin;
    step.all.win32 = function(state, done) {
      // @todo
      done();
    };
  });

  // Downloads.
  kbox.install.registerStep(function(step) {
    step.name = 'core-downloads';
    step.description = 'Downloading files...';
    step.deps = [
      'core-disk-space',
      'core-internet'
    ];
    step.all = function(state, done) {
      // Grab downloads from state.
      var downloads = state.downloads;
      if (!Array.isArray(downloads)) {
        return done(new TypeError('Invalid downloads: ' + downloads));
      }
      downloads.forEach(function(download, index) {
        if (typeof download !== 'string' || download.length < 1) {
          done(new TypeError('Invalid download: index: ' + index +
            ' cmd: ' + download));
        }
      });
      // Download.
      if (downloads.length > 0) {
        var downloadDir = kbox.util.disk.getTempDir();
        downloads.forEach(function(url) {
          state.log.debug([url, downloadDir].join(' -> '));
        });
        var downloadFiles = kbox.util.download.downloadFiles;
        downloadFiles(downloads, downloadDir, function(err) {
          if (err) {
            done(err);
          } else {
            done();
          }
        });
      }
      else {
        done();
      }
    };
  });

};
