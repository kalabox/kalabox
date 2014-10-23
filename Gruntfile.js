// @todo: add use strict here, doing it this way to test jshint

var
  COVERAGE_MIN = 30
  ;

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
      test_unit: { command: 'istanbul test _mocha' },
      test_coverage: { command: 'istanbul cover _mocha' },
      test_check_coverage: {
        command:
          'istanbul check-coverage coverage/coverage.json'
          + ' --statements ' + COVERAGE_MIN
          + ' --lines ' + COVERAGE_MIN
          + ' --functions ' + COVERAGE_MIN
          + ' --branches ' + COVERAGE_MIN
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

  grunt.registerTask('test', [
    'unit',
    'coverage'
  ]);

}
