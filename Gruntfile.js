// @todo: add use strict here, doing it this way to test jshint

module.exports = function(grunt) {

  //--------------------------------------------------------------------------
  // SETUP CONFIG
  //--------------------------------------------------------------------------

  // setup task config
  var config = {

    clean: {
      coverage: ['coverage']
    },

    shell: {
      // @todo: Maybe remove the .istanbul.yml file and put config here
      test_unit: { command: 'node_modules/istanbul/lib/cli.js  test node_modules/mocha/bin/_mocha' },
      test_coverage: { command: 'node_modules/istanbul/lib/cli.js  cover node_modules/mocha/bin/_mocha' },
      test_check_coverage: {
        command:
          'node_modules/istanbul/lib/cli.js check-coverage coverage/coverage.json'
          + ' --statements ' + 80
          + ' --branches ' + 50
          + ' --functions ' + 80
          + ' --lines ' + 80
      }
    },

    bump: {
      options: {
        files: ['package.json'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json', 'bower.json'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: false
      }
    },

    watch: {
      // bcauldwell: I'm just using this to make developing unit tests easier.
      unit: {
        files: ['**/*.js'],
        tasks: ['unit']
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

  // unit testing
  grunt.registerTask('unit', ['shell:test_unit']);

  // testing code coverage
  grunt.registerTask('coverage', [
    'clean:coverage',
    'shell:test_coverage',
    'shell:test_check_coverage'
  ]);

  grunt.registerTask('bump-patch', [
    'bump-only:patch'
  ]);

  grunt.registerTask('test', [
    'unit',
    'coverage'
  ]);

}
