'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var prompt = require('prompt');
var chalk = require('chalk');

module.exports = function(kbox, framework) {
  // Are you sure?
  // Authorize the update process
  kbox[framework].registerStep(function(step) {
    step.name = 'core-auth';
    step.description = 'Authorizing ' + framework + ' subroutines...';
    step.all = function(state, done) {
      // this is how we pass in CLI options to stop interactive mode
      // prompt.override = { doit: 'yes' }
      prompt.start();
      var msg = 'Are you sure you want to ' + framework + ' Kalabox? (y/n)';
      prompt.get({
        properties: {
          doit: {
            message: msg.magenta,
            validator: /y[es]*|n[o]?/,
            warning: 'Must respond yes or no',
            default: 'no'
          }
        }
      },
      function(err, result) {
        if (result.doit.match(/y[es]*?/)) {
          done();
        }
        else {
          state.log.info(chalk.red('Fine!') + ' Be that way!');
          process.exit(1);
        }
      });
    };
  });

  // Firewall.
  kbox[framework].registerStep(function(step) {
    step.name = 'core-firewall';
    step.description = 'Checking firewall settings...';
    step.deps = ['core-auth'];
    step.all.darwin = function(state, done) {
      kbox.util.firewall.isOkay(function(isOkay) {
        var err = isOkay ? null : new Error('Invalid firewall settings.');
        done(err);
      });
    };
  });

  // Internet.
  kbox[framework].registerStep(function(step) {
    step.name = 'core-internet';
    step.description = 'Checking for Internet access...';
    step.deps = ['core-firewall'];
    step.all = function(state, done) {
      var url = 'www.google.com';
      state.log.debug('Checking: ' + url);
      kbox.util.internet.check(url, function(err) {
        done(err);
      });
    };
  });

  // Disk space.
  kbox[framework].registerStep(function(step) {
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
  });

  // Downloads.
  kbox[framework].registerStep(function(step) {
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
