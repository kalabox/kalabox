'use strict';

module.exports = function(grunt) {

  //--------------------------------------------------------------------------
  // SETUP CONFIG
  //--------------------------------------------------------------------------

  // Helpful vars
  var platform = process.platform;
  var os = require('os');
  var pkg = require('./package.json');

  // JX CORE build helpers
  // Figure out what our compiled binary will be called
  var binBuild = [
    'kbox',
    process.platform,
    os.arch(),
    'v' + pkg.version
  ];

  // Add EXE if needed
  if (platform === 'win32') {
    binBuild.push('.exe');
  }

  // Build the binName
  var binName = binBuild.join('-');

  // Build commands
  var jxAddPatterns = [
    '*.js',
    '*.yml',
    '*.json',
    '*.cmd',
    '*.vbs',
    'version.lock'
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
    'dist/' + binName,
    '--add "' + jxAddPatterns.join(',') + '"',
    '--slime "' + jxSlimPatterns.join(',') + '"',
    '--native'
  ];
  var installCmd = ['npm', 'install', '--production'];
  // Figure out whether we want to not version lock our build
  if (!grunt.option('dev')) {
    installCmd.push('&&');
    installCmd.push('touch');
    installCmd.push('version.lock');
  }
  var buildCmds = [
    installCmd.join(' '),
    'mkdir dist',
    jxCmd.join(' ')
  ];

  // Add additional build cmd for POSIX
  if (platform !== 'win32') {
    buildCmds.push('chmod +x dist/' + binName);
    buildCmds.push('sleep 2');
  }

  // Documentation helpers
  var docBin = 'node_modules/.bin/documentation';
  var docOpts = [
    'build',
    '--output=docs',
    '--format=html'
  ];
  var docBuildCmd = [docBin, docOpts.join(' ')].join(' ');
  var docLintCmd = [docBin, 'lint'].join(' ');

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
          'scripts/lock.js',
          '*.json',
          'kalabox.yml'
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
            lines: 5,
            statements: 5,
            branches: 5,
            functions: 5
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
            cwd: 'build',
            maxBuffer: 20 * 1024 * 1024
          }
        },
        command: buildCmds.join(' && ')
      },
      docgen: {
        options: {
          execOptions: {
            maxBuffer: 20 * 1024 * 1024
          }
        },
        command: docBuildCmd
      },
      doclint: {
        options: {
          execOptions: {
            maxBuffer: 20 * 1024 * 1024
          }
        },
        command: docLintCmd
      }
    },

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
        globalReplace: false,
        prereleaseName: 'alpha',
        metadata: '',
        regExp: false
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

  // Generate documentation
  grunt.registerTask('docs', [
    'shell:doclint',
    'shell:docgen'
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

  // Build a binary
  grunt.registerTask('pkg', [
    'clean:build',
    'clean:dist',
    'copy:build',
    'shell:build',
    'copy:dist'
  ]);

};
