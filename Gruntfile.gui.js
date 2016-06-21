'use strict';

module.exports = function(grunt) {

  // loads all grunt-* tasks based on package.json definitions
  require('matchdep').filterAll('grunt-*').forEach(grunt.loadNpmTasks);

  /**
   * Load in our build configuration filez
   */
  var files = require('./grunt/files.js');
  var frontend = require('./grunt/frontend.js');
  var nw = require('./grunt/nw.js');
  var util = require('./grunt/util.js');
  var e2e = require('./grunt/e2e.js');

  /**
   * This is the configuration object Grunt uses to give each plugin its
   * instructions.
   */
  var taskConfig = {

    // Let's use our pkg info here
    pkg: grunt.file.readJSON('./package.json'),

    // Cleans out various dirs
    clean: {
      nw: nw.clean.nw
    },

    // Copies relevant things from a to b
    copy: {
      icns: nw.copy.icns
    },
    //annotates the sources before minifying.
    ngAnnotate: {
      compile: frontend.ngAnnotate.compile
    },
    // The `index` task compiles the `index.html` file as a Grunt template.r.
    index: {
      build: frontend.index.build,
      compile: frontend.index.compile
    },
    // Compress built NW assets
    compress: nw.compress(grunt),
    // Build the NW binaries
    nwjs: nw.nwjs(grunt),
    // Run Some NW shell things
    shell: {
      nw: nw.shell.nw,
      build: {command: nw.shell.build(grunt)},
    },
    delta: frontend.delta,
    protractor: {
      'protractor-setup': e2e.setup(grunt),
      test: e2e.protractor
    }
  };

  // Init our grunt config
  grunt.initConfig(grunt.util._.extend(taskConfig, files));

  /**
   * The default task is to build and compile.
   */
  grunt.renameTask('watch', 'delta');
  grunt.registerTask('watch', ['delta']);

  grunt.registerTask('default', ['build']);
  grunt.registerTask('sassBuild', ['sass:build']);

  var e2eTask = commonBuildTasks();
  e2eTask.push('protractor-setup');
  e2eTask.push('protractor:test');

  grunt.registerTask('e2e', e2eTask);

  /**
   * The `pkg` task gets your app ready for deployment by concatenating and
   * minifying your code.
   */
  // Start with our common build tasks
  var pkgTask = commonBuildTasks();
  // Clean out our NW dirs before we build
  pkgTask.push('clean:nw');
  // Add NW build to finish it off
  pkgTask.push('shell:build');
  pkgTask.push('nwjs');
  pkgTask.push('copy:icns');
  pkgTask.push('compress');
  // Finanly, register the packaging task
  grunt.registerTask('pkg', pkgTask);



};
