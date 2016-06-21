'use strict';

var path = require('path');
var pconfig = require('./test/pconfig');
var baseUrl = 'chrome-extension://noakblofbajciaghholgljpkieiennnn/index.html';

exports.config = {
  chromeDriver: './test/support/chromedriver',
  chromeOnly: true,
  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      args: ['nwapp=build'],
      binary: pconfig.devBinary
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
    includeStackTrace: true,
  },
  baseUrl: baseUrl,
  rootElement: 'body',

  onPrepare: function() {
    browser.resetUrl = 'chrome-extension://noakblofbajciaghholgljpkieiennnn/index.html';
    browser.driver.get('chrome-extension://noakblofbajciaghholgljpkieiennnn/index.html');
  }

};
