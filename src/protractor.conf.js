'use strict';

exports.config = {
  chromeDriver: './test/support/chromedriver',
  chromeOnly: true,
  framework: 'jasmine',

  specs: [
    'modules/*/e2e/*.spec.js'
  ],
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 1000000,
    isVerbose: true,
    includeStackTrace: true
  },
  rootElement: 'body',

  onPrepare: function() {
    var protocolSplit = browser.getLocationAbsUrl();
    console.log(protocolSplit);
  }

};
