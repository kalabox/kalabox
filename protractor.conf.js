'use strict';

var platformDir = {
  darwin: 'binary-nwjs-sdk-v0.14.6-osx-x64',
  linux: 'binary-nwjs-sdk-v0.14.6-linux-x64',
  win64: 'binary-nwjs-sdk-v0.14.6-win-x64'
};
var binary = {
  darwin: 'nwjs.app/Contents/MacOS/nwjs',
  linux: 'Kalabox',
  win64: 'Kalabox.exe'
};
var path = require('path');
var platform = require('os').platform();
var kbox = require('./lib/core/env.js');
var nwbDir = path.join(kbox.getHomeDir(), '.nwjs-builder', 'caches',
  platformDir[platform]);
var nwBinary = path.join(nwbDir, binary[platform]);
var chromedriver = path.join(nwbDir, 'chromedriver');

exports.config = {
  chromeDriver: chromedriver,
  chromeOnly: true,
  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      binary: nwBinary,
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
  rootElement: 'body',

  onPrepare: function() {
  }
};
