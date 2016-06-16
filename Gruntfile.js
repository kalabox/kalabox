'use strict';

module.exports = function(grunt) {

  // loads all grunt-* tasks based on package.json definitions
  require('matchdep').filterAll('grunt-*').forEach(grunt.loadNpmTasks);

  // Load in common information we can use across tasks
  var common = require('./tasks/common.js');

  // Determine whether the dev flag is on or off
  var dev = grunt.option('dev');

  // Load in delegated responsibilities because cleanliness => godliness
  var fs = require('./tasks/fs.js')(common);
  var shell = require('./tasks/shell.js')(common);
  var style = require('./tasks/style.js')(common);
  var unit = require('./tasks/unit.js')(common);
  var util = require('./tasks/util.js')(common);

  // Our Grut config object
  var config = {

    // Linting, standards and styles tasks
    jshint: style.jshint,
    jscs: style.jscs,

    // Copying tasks
    copy: {
      cliBuild: fs.copy.cli.build,
      cliDist: fs.copy.cli.dist
    },

    // Copying tasks
    clean: {
      cliBuild: fs.clean.cli.build,
      cliDist: fs.clean.cli.dist
    },

    // Unit test tasks
    mochacli: unit.mochacli,

    // Shell tasks
    shell: {
      cliBats: shell.batsTask(common.files.cliBats),
      cliPkg: shell.cliPkgTask(dev),
      installerOsx: shell.batsTask(common.files.installerOsxBats),
      installerLinux: shell.batsTask(common.files.installerLinuxBats)
    },

    // Utility tasks
    bump: util.bump

  };

  // Load in all our task config
  grunt.initConfig(config);

  // Check Linting, standards and styles
  grunt.registerTask('test:code', [
    'jshint',
    'jscs'
  ]);

  // Run unit tests
  grunt.registerTask('test:unit', [
    'mochacli:unit'
  ]);

  // Run CLI BATS tests
  grunt.registerTask('test:cli', [
    'shell:cliBats'
  ]);

  // Run Osx installer BATS tests
  grunt.registerTask('test:osx', [
    'shell:installerOsx'
  ]);

  // Run Linux installer BATS tests
  grunt.registerTask('test:osx', [
    'shell:installerOsx'
  ]);

  // Bump our minor version
  grunt.registerTask('bigrelease', [
    'bump:minor'
  ]);

  // Bump our patch version
  grunt.registerTask('release', [
    'bump:patch'
  ]);

  // Do a prerelease version
  grunt.registerTask('prerelease', [
    'bump:prerelease'
  ]);

  // Pkg the CLI binary
  grunt.registerTask('pkg:cli', [
    'clean:cliBuild',
    'clean:cliDist',
    'copy:cliBuild',
    'shell:cliPkg',
    'copy:cliDist'
  ]);

};
