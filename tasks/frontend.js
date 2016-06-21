'use strict';

/**
 * This file/module contains helpful frontend config.
 */

module.exports = function(common) {

  return {

    // Installs bower deps
    bower: {
      install: {
        options: {
          directory: 'src/lib/vendor'
        }
      }
    },

    /**
     * `grunt concat` concatenates multiple source files into a single file.
     */
    concat: {
      /**
       * The `build_css` target concatenates compiled CSS and vendor CSS
       * together.
       */
      buildCss: {
        options: {
          banner:
          '/**\n' +
          ' * Kalabox\n' +
          ' * Compiled: <%= grunt.template.today("yyyy-mm-dd") %>\n' +
          ' * kalabox.io\n' +
          ' *\n' +
          ' * Copyright (c) <%= grunt.template.today("yyyy") %> ' +
          'Kalabox Inc.\n' +
          ' */\n'
        },
        src: [
          common.files.vendorCss,
          'build/gui/assets/kbox.css'
        ],
        dest: 'build/gui/assets/kbox.css'
      }
    },

    /**
     * The `index` task compiles the `index.html` file as a Grunt template. CSS
     * and JS files co-exist here but they get split apart later.
     */
    index: {
      build: {
        dir: 'build/gui',
        src: [
          common.files.vendorJs,
          'build/gui/src/modules/**/*.js',
          'build/gui/templates-app.js',
          common.files.vendorCss,
          'build/gui/assets/kbox.css'
       ]
      }
    },

    /**
     * HTML2JS is a Grunt plugin that takes all of your template files and
     * places them into JavaScript files as strings that are added to
     * AngularJS's template cache. This means that the templates too become
     * part of the initial payload as one JavaScript file. Neat!
     */
    html2js: {
      /**
       * These are the templates from `src/modules`.
       */
      app: {
        options: {
          base: 'src'
        },
        src: common.files.htmlTpl,
        dest: 'build/gui/templates-app.js'
      },

      /**
       * These are the templates from `src/common`.
       * @todo: do we need this? Doesn't seem so, disabled in compile.
       */
      common: {
        options: {
          base: 'src/common'
        },
        src: common.files.html,
        dest: 'build/gui/templates-common.js'
      }
    },

    /**
     * `grunt-contrib-sass` handles our LESS compilation and uglification automatically.
     * Only our `main.scss` file is included in compilation; all other files
     * must be imported from this file.
     */
    sass: {
      compile: {
        files: {
          'build/gui/assets/kbox.css': 'src/scss/main.scss'
        },
        options: {
          style: 'compressed'
        }
      }
    }
  };

};
