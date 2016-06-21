'use strict';

/**
 * This file/module contains helpful frontend config.
 */

module.exports = {

  /**
   * Clean out the build dirs
   */
  clean: {
    build: [
      '<%= buildDir %>',
      '<%= compileDir %>'
    ]
  },

  /**
   * Basic bower task that uses
   * Bower's API's directly.
   */
  bower : {
    install: {
      options: {
        directory: 'src/lib/vendor'
      },
    },
    ci: {
      options: {
        directory: 'src/lib/vendor',
        interactive: false
      }
    }
  },

  /**
   * The `copy` task just copies files from A to B. We use it here to copy
   * our project assets (images, fonts, etc.) and javascripts into
   * `build_dir`, and then to copy the assets to `compile_dir`.
   */
  copy: {
    buildAppAssets: {
      files: [
        {
          src: ['**'],
          dest: '<%= buildDir %>/images/',
          cwd: 'src/images',
          expand: true
        },
        {src: ['package.json'], dest: '<%= buildDir %>/package.json'}
    ]
    },
    buildVendorAssets: {
      files: [
        {
          src: ['**'],
          dest: '<%= buildDir %>/fonts/',
          cwd: 'src/lib/vendor/font-awesome/fonts',
          expand: true
        }
    ]
    },
    buildAppJs: {
      files: [
        {
          src: ['<%= appFiles.js %>'],
          dest: '<%= buildDir %>/',
          cwd: '.',
          expand: true
        }
     ]
    },
    buildVendorJs: {
      files: [
        {
          src: ['<%= vendorFiles.js %>'],
          dest: '<%= buildDir %>/',
          cwd: '.',
          expand: true
        }
     ]
    },
    buildVendorCss: {
      files: [
        {
          src: ['<%= vendorFiles.css %>'],
          dest: '<%= buildDir %>/',
          cwd: '.',
          expand: true
        }
     ]
    },
    compileAssets: {
      files: [
        {
          src: ['**'],
          dest: '<%= compileDir %>',
          cwd: '<%= buildDir %>/assets',
          expand: true
        },
        {
          src: ['<%= vendorFiles.css %>'],
          dest: '<%= compileDir %>/',
          cwd: '.',
          expand: true
        }
     ]
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
      src: [
        '<%= vendorFiles.css %>',
        '<%= buildDir %>/assets/<%= pkg.name %>-<%= pkg.version %>.css'
     ],
      dest: '<%= buildDir %>/assets/<%= pkg.name %>-<%= pkg.version %>.css'
    },
    /**
     * The `compile_js` target is the concatenation of our application source
     * code and all specified vendor source code into a single file.
     */
    compileJs: {
      options: {
        banner: '<%= meta.banner %>'
      },
      src: [
        '<%= vendorFiles.js %>',
        //'module.prefix',
        '<%= buildDir %>/src/modules/**/*.js',
        '<%= html2js.app.dest %>',
        'module.suffix'
     ],
      dest: '<%= compileDir %>/<%= pkg.name %>-<%= pkg.version %>.js'
    }
  },

  /**
   * `ngAnnotate` annotates the sources before minifying. That is, it allows us
   * to code without the array syntax.
   */
  ngAnnotate: {
    compile: {
      files: [
        {
          src: ['<%= appFiles.js %>'],
          cwd: '<%= buildDir %>',
          dest: '<%= buildDir %>',
          expand: true
        }
     ]
    }
  },

  /**
   * `grunt-contrib-sass` handles our LESS compilation and uglification automatically.
   * Only our `main.scss` file is included in compilation; all other files
   * must be imported from this file.
   */
  sass: {
    build: {
      files: {
        '<%= buildDir %>/assets/<%= pkg.name %>-<%= pkg.version %>.css':
          '<%= appFiles.sass %>'
      }
    },
    compile: {
      files: {
        '<%= buildDir %>/assets/<%= pkg.name %>-<%= pkg.version %>.css':
          '<%= appFiles.sass %>'
      },
      options: {
        cleancss: true,
        compress: true
      }
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
      src: ['<%= appFiles.atpl %>'],
      dest: '<%= buildDir %>/templates-app.js'
    },

    /**
     * These are the templates from `src/common`.
     * @todo: do we need this? Doesn't seem so, disabled in compile.
     */
    common: {
      options: {
        base: 'src/common'
      },
      src: ['<%= appFiles.ctpl %>'],
      dest: '<%= buildDir %>/templates-common.js'
    }
  },

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
