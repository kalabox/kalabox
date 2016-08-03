'use strict';

// Node modules
var path = require('path');
var version = require('./tasks/nw.js')().pkg.options.version;

/*
 * Translate node process.platform into NWJS platform
 */
var getPlat = function() {
  switch (process.platform) {
    case 'win32': return 'win';
    case 'darwin': return 'osx';
    case 'linux': return 'linux';
  }
};

/*
 * Return the expected nwjs directory based on plat and arch
 */
var getNWDir = function() {

  // Get some info before we start building
  var arch = require('os').arch();
  var homeDir = require('./lib/core/env.js').getHomeDir();

  // Build the destination directory
  var nwjsBaseDir = ['binary-nwjs-sdk-v' + version, getPlat(), arch].join('-');

  // Return the nwjs base dir
  return path.join(homeDir, '.nwjs-builder', 'caches', nwjsBaseDir);

};

/*
 * Return the expected nwjs binary based on platform
 */
var getNWBinary = function() {

  // Build a list of locations for us based on plat
  var binary = {
    osx: 'nwjs.app/Contents/MacOS/nwjs',
    linux: 'nw',
    win: 'nw.exe'
  };

  // Return the binary location
  return path.join(getNWDir(), binary[getPlat()]);

};

exports.config = {
  chromeDriver: path.join(getNWDir(), 'chromedriver'),
  chromeOnly: true,
  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      binary: getNWBinary(),
      args: ['nwapp=build/gui']
    }
  },
  framework: 'jasmine',

  specs: [
    'src/modules/*/e2e/*.spec.js'
  ],
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 1000000,
    isVerbose: true,
    includeStackTrace: true
  },
  baseUrl: '',
  rootElement: 'body'
};
