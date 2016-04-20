'use strict';

module.exports = function(grunt) {

  //--------------------------------------------------------------------------
  // SETUP CONFIG
  //--------------------------------------------------------------------------

  // Helpers to make things cleaner
  var funcOpts = {execOptions: {maxBuffer: 20 * 1024 * 1024}};
  var funcCommand = 'node_modules/bats/libexec/bats ${CI:+--tap}';
  var platform = process.platform;

  // setup task config
  var config = {

    // This handles automatic version bumping
    bump: {
      options: {
        files: [
          'package.json'
        ],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json', 'app/package.json'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        pushTo: 'origin',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
        globalReplace: false,
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
        command: funcCommand + ' ./test/darwin/*.bats'
      },
      linux: {
        options: funcOpts,
        command: funcCommand + ' ./test/linux.bats'
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
    'shell:' + platform
  ]);

};
