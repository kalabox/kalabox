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
    '*.yml',
    '*.json',
    '*.cmd',
    '*.vbs'
  ];
  var jxSlimPatterns = [
    '*.spec',
    '*test/*',
    '*kalabox-app-*/*',
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

  // Setup task config
  var config = {

    // Some helpful file groups
    files: {
      // All JS files
      js: {
        src: [
          'lib/**/*.js',
          'plugins/**/*.js',
          'plugins/**/**/*.js',
          'plugins/**/**/**/*.js',
          'test/**/*.js',
          'bin/kbox.js',
          'scripts/*.js',
          'Gruntfile.js'
        ]
      },
      // Relevant build files
      build: {
        src: [
          'bin/kbox.*',
          'lib/**',
          'plugins/**',
          '*.json',
          'kalabox.yml',
          'development.yml'
        ],
      }
    },

    // Copy tasks
    copy: {
      // Copy build files to build directory
      build: {
        src: '<%= files.build.src %>',
        dest: 'build/'
      },
      // Copy build artifacts to dist directory
      dist: {
        src: 'build/dist/' + binName,
        dest: 'dist/' + binName,
        options: {
          mode: true
        }
      }
    },

    // Clean pathzzz
    clean: {
      coverage: ['coverage'],
      build: ['build'],
      dist: ['dist']
    },

    // Run unit tests
    mochacli: {
      options: {
        bail: true,
        reporter: 'nyan',
        recursive: true,
        env: {
          WINSTON_SHUTUP: true
        }
      },
      unit: ['./test/*.spec.js', './test/**/*.spec.js']
    },

    // Chech coverage and things
    /* jshint ignore:start */
    // jscs:disable
    mocha_istanbul: {
      coverage: {
        src: './test',
        options: {
          mask: '*.spec.js',
          coverage:true,
          check: {
            lines: 10,
            statements: 10,
            branches: 10,
            functions: 10
          },
          root: './lib',
          reportFormats: ['lcov','html']
        }
      }
    },
    /* jshint ignore:end */
    // jscs:enable

    // Shell tasks for building
    shell: {
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

    // Some linting
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: ['Gruntfile.js', '<%= files.js.src %>']
    },

    // Some code standards
    jscs: {
      src: ['Gruntfile.js', '<%= files.js.src %>'],
      options: {
        config: '.jscsrc'
      }
    },

    // Some pretty shitty api docs
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
    }

  };

  //--------------------------------------------------------------------------
  // LOAD TASKS
  //--------------------------------------------------------------------------

  // load task config
  grunt.initConfig(config);

  // load grunt-* tasks from package.json dependencies
  require('matchdep').filterAll('grunt-*').forEach(grunt.loadNpmTasks);

  //--------------------------------------------------------------------------
  // SETUP WORKFLOWS
  //--------------------------------------------------------------------------

  // Run just unit tests
  grunt.registerTask('test:unit', [
    'mochacli:unit'
  ]);

  // Run just coverage reports
  grunt.registerTask('test:coverage', [
    'mocha_istanbul:coverage'
  ]);

  // Run just code styles
  grunt.registerTask('test:code', [
    'jshint',
    'jscs'
  ]);

  // Run all the tests
  grunt.registerTask('test', [
    'test:code',
    'test:unit',
    'test:coverage'
  ]);

  // Bump our patch version
  grunt.registerTask('bump-patch', [
    'bump-only:patch'
  ]);

  // Build a binary
  grunt.registerTask('build', [
    'clean:build',
    'clean:dist',
    'copy:build',
    'shell:build',
    'copy:dist'
  ]);

};
