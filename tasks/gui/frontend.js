'use strict';

/**
 * This file/module contains helpful frontend config.
 */

module.exports = {

  /**
   * The `index` task compiles the `index.html` file as a Grunt template. CSS
   * and JS files co-exist here but they get split apart later.
   */
  index: {

    /**
     * During development, we don't want to have wait for compilation,
     * concatenation, minification, etc. So to avoid these steps, we simply
     * add all script files directly to the `<head>` of `index.html`. The
     * `src` property contains the list of included files.
     */
    build: {
      dir: '<%= buildDir %>',
      src: [
        '<%= vendorFiles.js %>',
        '<%= buildDir %>/src/modules/**/*.js',
        '<%= html2js.app.dest %>',
        '<%= vendorFiles.css %>',
        '<%= buildDir %>/assets/<%= pkg.name %>-<%= pkg.version %>.css'
     ]
    },

    /**
     * When it is time to have a completely compiled application, we can
     * alter the above to include only a single JavaScript and a single CSS
     * file. Now we're back!
     */
    compile: {
      dir: '<%= compileDir %>',
      src: [
        '<%= concat.compileJs.dest %>',
        '<%= vendorFiles.css %>',
        '<%= buildDir %>/assets/<%= pkg.name %>-<%= pkg.version %>.css'
     ]
    }
  },
  delta: {
    /**
     * By default, we want the Live Reload to work for all tasks; this is
     * overridden in some tasks (like this file) where browser resources are
     * unaffected. It runs by default on port 35729, which your browser
     * plugin should auto-detect.
     */
    options: {
      livereload: true
    },

    /**
     * When the Gruntfile changes, we just want to lint it. In fact, when
     * your Gruntfile changes, it will automatically be reloaded!
     */
    gruntfile: {
      files: 'Gruntfile.js',
      tasks: ['jshint:gruntfile'],
      options: {
        livereload: false
      }
    },

    /**
     * When our JavaScript source files change, we want to run lint them and
     * run our unit tests.
     */
    jssrc: {
      files: [
        '<%= appFiles.js %>'
     ],
      tasks: ['jshint:src', 'copy:buildAppJs']
    },

    /**
     * When app js files are changed, copy them. Note that this will
     * *not* copy new files.
     */
    appJS: {
      files: [
        'src/modules/**/*'
     ],
      tasks: ['copy:buildAppJs']
    },

    /**
     * When assets are changed, copy them. Note that this will *not* copy new
     * files, so this is probably not very useful.
     */
    assets: {
      files: [
        'src/assets/**/*'
     ],
      tasks: ['copy:buildAppAssets', 'copy:buildVendorAssets']
    },

    /**
     * When index.html changes, we need to compile it.
     */
    html: {
      files: ['<%= appFiles.html %>'],
      tasks: ['index:build']
    },

    /**
     * When our templates change, we only rewrite the template cache.
     */
    tpls: {
      files: [
        '<%= appFiles.atpl %>'
     ],
      tasks: ['html2js:app']
    },

    /**
     * When the CSS files change, we need to compile and minify them.
     */
    sass: {
      files: ['src/**/*.scss'],
      tasks: ['sass:build']
    },

    /**
     * When a JavaScript unit test file changes, we only want to lint it and
     * run the unit tests. We don't want to do any live reloading.
     */
    jsunit: {
      files: [
        '<%= appFiles.jsunit %>'
     ],
      tasks: ['jshint:test'],
      options: {
        livereload: false
      }
    },
  }
};
