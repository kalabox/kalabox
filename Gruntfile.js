'use strict';

module.exports = function(grunt) {

  //--------------------------------------------------------------------------
  // SETUP CONFIG
  //--------------------------------------------------------------------------

  // setup task config
  var config = {

    // Arrays of relevant code classified by type
    files: {
      js: {
        src: [
          'lib/**/*.js',
          'plugins/**/*.js',
          'test/**/*.js',
          'bin/kbox.js'
        ]
      }
    },

    clean: {
      coverage: ['coverage']
    },

    shell: {
      // @todo: Maybe remove the .istanbul.yml file and put config here
      testUnit: {
        command:
            'node_modules/istanbul/lib/cli.js ' +
            'test ' +
            'node_modules/mocha/bin/_mocha ' +
            './test/'
        },
      testLarge: {
        command: 'node_modules/mocha/bin/_mocha --bail test/large'},
      testCoverage: {
        command:
        'node_modules/istanbul/lib/cli.js ' +
        'cover node_modules/mocha/bin/_mocha ./test/'},
      testCheckCoverage: {
        command:
          'node_modules/istanbul/lib/cli.js ' +
          'check-coverage coverage/coverage.json ' +
          '--statements ' + 0 +
          ' --branches ' + 0 +
          ' --functions ' + 0 +
          ' --lines ' + 0
      }
    },

    // This handles automatic version bumping in travis
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

    // Some linting and code standards
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: ['Gruntfile.js', '<%= files.js.src %>']
    },
    jscs: {
      src: ['Gruntfile.js', '<%= files.js.src %>'],
      options: {
        config: '.jscsrc'
      }
    },
    jsdoc: {
      safe: {
        src: [
          'lib/app.js',
          'lib/core/*.js',
          'lib/engine.js',
          'lib/engine/provider.js',
          'lib/services.js'
        ],
        options: {
          destination: 'doc',
          template: 'node_modules/jsdoc-oblivion/template',
          configure : '.jsdoc.conf.json'
        }
      },
      secret: {
        src: ['lib/**/*.js'],
        options: {
          destination: 'doc',
          template: 'node_modules/jsdoc-oblivion/template',
          configure : '.jsdoc.conf.json'
        }
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
  grunt.registerTask('unit', [
    'shell:testUnit'
  ]);

  // testing code coverage
  grunt.registerTask('coverage', [
    'clean:coverage',
    'shell:testCoverage',
    'shell:testCheckCoverage'
  ]);

  grunt.registerTask('bump-patch', [
    'bump-only:patch'
  ]);

  grunt.registerTask('test', [
    'unit',
    'coverage'
  ]);

  // large functional testing
  grunt.registerTask('test:large', [
    'shell:test_large'
  ]);

  grunt.registerTask('test:code', [
    'jshint',
    'jscs'
  ]);

};
