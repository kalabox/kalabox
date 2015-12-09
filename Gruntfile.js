'use strict';

module.exports = function(grunt) {

  //--------------------------------------------------------------------------
  // SETUP CONFIG
  //--------------------------------------------------------------------------

  // Helpful vars
  var platform = process.platform;

  // Figure out what our compiled binary will be called
  var binName = (platform === 'win32') ? 'kbox.exe' : 'kbox';

  // Build commands
  var jxAddPatterns = [
    '*.js',
    '*.json',
    '*.cmd',
    '*.vbs'
  ];
  var jxSlimPatterns = [
    '*.spec',
    '*test/*',
    '.git/*'
  ];
  var jxCmd = [
    'jx package',
    'bin/kbox.js',
    'dist/kbox',
    '--add "' + jxAddPatterns.join(',') + '"',
    '--slime "' + jxSlimPatterns.join(',') + '"',
    '--native'
  ];
  var buildCmds = [
    'npm install --production',
    'mkdir dist',
    jxCmd.join(' ')
  ];

  // Add additional build cmd for POSIX
  if (platform !== 'win32') {
    buildCmds.push('chmod +x dist/kbox');
    buildCmds.push('sleep 2');
  }

  // setup task config
  var config = {

    // Arrays of relevant code classified by type
    files: {
      js: {
        src: [
          'lib/**/*.js',
          'plugins/**/*.js',
          'plugins/**/**/*.js',
          'test/**/*.js',
          'bin/kbox.js',
          'scripts/*.js'
        ]
      },
      build: {
        src: [
          'bin/kbox.*',
          'lib/**',
          'plugins/**',
          'scripts/postinstall.js',
          '*.json'
        ],
      }
    },

    // Copy
    copy: {
      build: {
        src: '<%= files.build.src %>',
        dest: 'build/'
      },
      dist: {
        src: 'build/dist/' + binName,
        dest: 'dist/' + binName,
        options: {
          mode: true
        }
      }
    },

    // Clean paths
    clean: {
      coverage: ['coverage'],
      build: ['build'],
      dist: ['dist']
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
        command: 'node_modules/mocha/bin/_mocha --bail test_large'},
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
      },
      functionalTest: {
        command: 'time node ftest/ftest.js'
      },
      build: {
        options: {
          execOptions: {
            cwd: 'build'
          }
        },
        command: buildCmds.join(' && ')
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
          'README.md',
          'lib/app.js',
          'lib/core/*.js',
          'lib/create.js',
          'lib/engine.js',
          'lib/engine/provider.js',
          'lib/install.js',
          'lib/kbox.js',
          'lib/services.js',
          'lib/update.js',
          'lib/util/*.js'
        ],
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

  // functional testing
  grunt.registerTask('ftest', [
    'shell:functionalTest'
  ]);

  // testing code coverage
  grunt.registerTask('coverage', [
    'clean:coverage',
    'shell:testCoverage',
    'shell:testCheckCoverage'
  ]);

  // Bump our patch version
  grunt.registerTask('bump-patch', [
    'bump-only:patch'
  ]);

  // Run all the tests
  grunt.registerTask('test', [
    'unit',
    'coverage'
  ]);

  // Build a binary
  grunt.registerTask('build', [
    'clean:build',
    'clean:dist',
    'copy:build',
    'shell:build',
    'copy:dist'
  ]);

  // large functional testing
  grunt.registerTask('test:large', [
    'shell:testLarge'
  ]);

  // Lint and code styles
  grunt.registerTask('test:code', [
    'jshint',
    'jscs'
  ]);

};
