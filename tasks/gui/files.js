'use strict';

/**
 * This file/module contains helpful file location config.
 */

var vendorDir = 'src/lib/vendor/';

module.exports = {

  /**
   * The `build_dir` folder is where our projects are compiled during
   * development and the `compile_dir` folder is where our app resides once it's
   * completely built.
   */
  buildDir: 'build',
  compileDir: 'generated',

  /**
   * This is a collection of file patterns that refer to our app code (the
   * stuff in `src/`). These file paths are used in the configuration of
   * build tasks. `js` is all project javascript, less tests. `ctpl` contains
   * our reusable components' (`src/common`) template HTML files, while
   * `atpl` contains the same, but for our app's code. `html` is just our
   * main HTML file, `sass` is our main stylesheet, and `unit` contains our
   * app's unit tests.
   */
  appFiles: {
    js: ['src/modules/**/*.js', '!src/modules/**/*.spec.js'],
    jsunit: ['src/**/*.spec.js'],

    atpl: ['src/**/*.html.tmpl'],
    ctpl: ['src/**/*.html'],

    html: ['src/index.html'],
    sass: 'src/scss/main.scss'
  },

  /**
   * This is a collection of files used during testing only.
   */
  testFiles: {
    js: [
      'vendor/angular-mocks/angular-mocks.js'
    ]
  },

  /**
   * This is the same as `app_files`, except it contains patterns that
   * reference vendor code (`vendor/`) that we need to place into the build
   * process somewhere. While the `app_files` property ensures all
   * standardized files are collected for compilation, it is the user's job
   * to ensure non-standardized (i.e. vendor-related) files are handled
   * appropriately in `vendor_files.js`.
   *
   * The `vendor_files.js` property holds files to be automatically
   * concatenated and minified with our project source files.
   *
   * The `vendor_files.css` property holds any CSS files to be automatically
   * included in our app.
   *
   * The `vendor_files.assets` property holds any assets to be copied along
   * with our app's assets. This structure is flattened, so it is not
   * recommended that you use wildcards.
   */
  vendorFiles: {
    js: [
      vendorDir + 'bluebird/js/browser/bluebird.js',
      vendorDir + 'jquery/dist/jquery.js',
      vendorDir + 'd3/d3.js',
      vendorDir + 'angular-ui-utils/modules/route/route.js',
      vendorDir + 'angular/angular.js',
      vendorDir + 'angular-ui-router/release/angular-ui-router.min.js',
      vendorDir + 'angular-bootstrap/ui-bootstrap.min.js',
      vendorDir + 'angular-bootstrap/ui-bootstrap-tpls.min.js',
      vendorDir + 'angular-bluebird-promises/dist/angular-bluebird-promises.js',
      vendorDir + 'jasny-bootstrap/dist/js/jasny-bootstrap.min.js',
      vendorDir + 'angular-ui-switch/angular-ui-switch.min.js'
    ],
    css: [
      vendorDir + 'font-awesome/css/font-awesome.min.css',
      vendorDir + 'angular-ui-switch/angular-ui-switch.min.css',
      vendorDir + 'loaders.css/loaders.min.css'
    ],
    assets: [
      vendorDir + 'font-awesome/fonts/fontawesome-webfont.woff',
      vendorDir + 'font-awesome/fonts/fontawesome-webfont.ttf'
    ]
  },
};
