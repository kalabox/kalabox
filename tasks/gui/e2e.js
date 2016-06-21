'use strict';

var path = require('path');
var pconfig = require('../test/pconfig');

var setup = function(grunt) {

  grunt.registerTask('protractor-setup', 'Protractor setup task', function() {
    // quick check for the appropriate directories to run protractor
    var fs = require('fs');
    var exec = require('child_process').exec;
    var dir = 'test/support';
    var selenium = 'node_modules/grunt-protractor-runner/node_modules' +
    '/protractor/selenium';

    var symlinkDst = path.resolve(dir, pconfig.devSymlink.file);
    var cdFile = path.resolve(dir, 'chromedriver');

    var supportExists = fs.existsSync(dir);
    var symlinkExists = fs.existsSync(symlinkDst);
    var cdExists = fs.existsSync(cdFile);
    var seleniumExists = fs.existsSync(selenium);

    if (supportExists && symlinkExists && cdExists && seleniumExists) {
      return;
    }

    // something doesn't exist so check & install everything.
    var done = this.async();
    var http = require('http');
    var unzip = require('unzip');
    var symlinkFile = pconfig.devSymlink.file;
    var symlinkPath = path.normalize(pconfig.devSymlink.path);
    var symlinkSrc = path.resolve(symlinkPath, symlinkFile);
    var cdRemote = pconfig.chromedriverDownload;
    var cdLocal = path.resolve(
      dir, pconfig.chromedriverDownload.split('/').pop());

    var download = function(url, dest, cb, cbdone) {
      var file = fs.createWriteStream(dest);
      http.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
          cb(cbdone);
        });
      });
    };

    var downloadSelenium = function() {
      exec('./node_modules/grunt-protractor-runner/node_modules/protractor' +
        '/bin/webdriver-manager update', function(error) {
        if (error !== null) {
          console.log(error);
        } else {
          grunt.log.writeln('Created and updated selenium.');
        }
      });
    };
    var extractChromedriver = function(cbdone) {
      grunt.log.writeln('Extracting node-webkit chromedriver.');

      if (pconfig.platform === 'linux') {
        var Targz = require('tar.gz');
        var compress = new Targz();
        compress.extract(cdLocal, dir, function(err) {
          if (err) {
            console.log(err);
          }

          var cdSrc = path.resolve(
            cdLocal.replace(/\.tar\.gz$/, ''), 'chromedriver');
          fs.renameSync(cdSrc, cdFile);

          grunt.log.writeln('Protractor setup is complete.');
          grunt.log.writeln('To run tests, you may now run: grunt e2e');
          cbdone();
        });
      }
      else {
        fs.createReadStream(cdLocal)
          .pipe(unzip.Parse())
          .on('entry', function(entry) {
            if (entry.path.indexOf('/chromedriver') >= 0) {
              entry.pipe(fs.createWriteStream(cdFile));
            } else {
              entry.autodrain();
            }
          })
          .on('finish', function() {
            // *nix only?
            fs.chmodSync(cdFile, '0755');
            grunt.log.writeln('Protractor setup is complete.');
            grunt.log.writeln('To run tests, you may now run: grunt e2e');
            cbdone();
          });
      }
    };

    if (!supportExists) {
      grunt.log.writeln('Creating support directory.');
      fs.mkdir(dir);
    }

    if (!symlinkExists) {
      grunt.log.writeln('Creating support link to node-webkit.');
      fs.symlinkSync(symlinkSrc, symlinkDst);
    }

    if (!seleniumExists) {
      grunt.log.writeln('Downloading selenium.');
      downloadSelenium();
    }

    if (!cdExists) {
      grunt.log.writeln('Downloading node-webkit chromedriver.');
      download(
        cdRemote,
        cdLocal,
        extractChromedriver,
        done);
    }
  });
};

// Return the codes
module.exports = {

  setup: setup,

  // https://github.com/nadavsinai/node-wekbit-testing/blob/master/protractor.conf.js
  protractor: {
    options: {
      configFile: 'protractor.conf.js',
      args: {
        chromeDriver: 'test/support/chromedriver',
        chromeOnly: true,
        capabilities: {
          browserName: 'chrome',
          chromeOptions: {
            args: ['nwapp=build'],
            binary: pconfig.devBinary
          }
        },
        jasmineNodeOpts: {
          showColors: true,
          defaultTimeoutInterval: 3000000,
          isVerbose: true,
          includeStackTrace: true,
        },
        framework: 'jasmine',
        baseUrl: 'chrome-extension://noakblofbajciaghholgljpkieiennnn/' +
        'index.html',
        rootElement: 'body'
      }
    },
    default: {
      specs: [
      'src/modules/*/e2e/*.spec.js'
      ]
    }
  }
};
