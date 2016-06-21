'use strict';

/**
 * This file/module contains helpful file location config.
 */

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

};
