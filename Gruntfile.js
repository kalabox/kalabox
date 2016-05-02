'use strict';

module.exports = function(grunt) {

  //--------------------------------------------------------------------------
  // SETUP CONFIG
  //--------------------------------------------------------------------------

  // Helpers to make things cleaner
  var funcOpts = {execOptions: {maxBuffer: 20 * 1024 * 1024}};
  var funcPlatform = process.platform;
  var funcCommand = [
    'KBOX_TEST_PLATFORM=' + funcPlatform,
    'node_modules/bats/libexec/bats',
    '${CI:+--tap}'
  ].join(' ');

  // setup task config
  var config = {

    // This handles automatic version bumping in travis
    bump: {
      options: {
        files: ['package.json'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'origin',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
        globalReplace: true,
        prereleaseName: 'alpha',
        metadata: '',
        regExp: false
      }
    },

    // Basic BATS test
    shell: {
      // @todo: windows specific tests
      win32: {
        options: funcOpts,
        command: 'echo "OS not implemented yet"',
      },
      darwin: {
        options: funcOpts,
        command: [
          funcCommand,
          ' ./test/basic.bats',
          ' ./test/darwin/*.bats'
        ].join(' ')
      },
      linux: {
        options: funcOpts,
        command: [
          funcCommand,
          ' ./test/basic.bats',
          ' ./test/linux/*.bats'
        ].join(' ')
      }
    }

  };

  //--------------------------------------------------------------------------
  // LOAD TASKS
  //--------------------------------------------------------------------------

  // load task config
  grunt.initConfig(config);

  // load external tasks
  //grunt.loadTasks('tasks');

  // load grunt-* tasks from package.json dependencies
  require('matchdep').filterAll('grunt-*').forEach(grunt.loadNpmTasks);

  //--------------------------------------------------------------------------
  // SETUP WORKFLOWS
  //--------------------------------------------------------------------------

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

  /*
   * Functional tests
   */
  // Verify the install
  grunt.registerTask('test', [
    'shell:' + funcPlatform
  ]);

};
