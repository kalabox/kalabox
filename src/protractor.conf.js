'use strict';


exports.config = {
  //chromeDriver: './test/support/chromedriver',
  chromeOnly: true,
  capabilities: {
    browserName: 'chrome',
    chromeOptions: {
      args: ['nwapp=dist/gui/kalabox-ui/Kalabox.app/Resources/app.nw'],
      binary: 'dist/gui/kalabox-ui/Kalabox.app/Contents/MacOS/nwjs'
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