'use strict';

var path = require('path');
var pconfig = require('../test/pconfig');
var nwBuilder = require('nwjs-builder');
var kbox = require('../lib/core/env.js');
var nwConfig = require('./nw.js');
var nwbDir = path.join(kbox.getHomeDir(), '.nwjs-builder', 'caches',
  pconfig.platformDir);
var nwBinary = nwBuilder.GetExecutable(nwbDir, pconfig.platform);
// @todo: we should get chromedriver from same place and delete chromedriver
// logic.
var chromedriver = path.join(nwbDir, 'chromedriver');
var fs = require('fs');

var setup = function(grunt) {

  grunt.registerTask('protractor-setup', 'Protractor setup task', function() {
    // quick check for the appropriate directories to run protractor
    var fs = require('fs');
    var exec = require('child_process').exec;
    var dir = 'test/support';
    var selenium = 'node_modules/grunt-protractor-runner/node_modules' +
    '/protractor/selenium';

    var cdFile = path.resolve(dir, 'chromedriver');

    var supportExists = fs.existsSync(dir);
    var cdExists = fs.existsSync(cdFile);
    var seleniumExists = fs.existsSync(selenium);

    if (supportExists && cdExists && seleniumExists) {
      return;
    }

    // something doesn't exist so check & install everything.
    var done = this.async();
    var http = require('http');
    var unzip = require('unzip');
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

console.log(process.cwd());
console.log(nwBinary);
console.log(chromedriver);


// Return the codes
module.exports = {

  setup: setup,

  // https://github.com/nadavsinai/node-wekbit-testing/blob/master/protractor.conf.js
  protractor: {
    options: {
      args: {
        chromeDriver: chromedriver,
        chromeOnly: true,
        capabilities: {
          browserName: 'chrome',
          chromeOptions: {
            args: ['nwapp=build/gui'],
            binary: nwBinary
          }
        },
        specs: [
        './src/modules/*/e2e/*.spec.js'
        ],
        jasmineNodeOpts: {
          showColors: true,
          defaultTimeoutInterval: 3000000,
          isVerbose: true,
          includeStackTrace: true,
        },
        framework: 'jasmine',
        rootElement: 'body'
      }
    }
  }
};
