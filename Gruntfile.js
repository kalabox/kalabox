'use strict';

module.exports = function(grunt) {

  // General helpers
  var platform = process.platform;
  var os = require('os');
  var pkg = require('./package.json');

  // Shell helper
  var shellOpts = {execOptions: {maxBuffer: 20 * 1024 * 1024}};

  // BATS helpers
  var funcPlatform = process.platform;
  var funcCommand = [
    'KBOX_TEST_PLATFORM=' + funcPlatform,
    'node_modules/bats/libexec/bats',
    '${CI:+--tap}'
  ].join(' ');

  // JX helpers
  var binBuild = ['kbox', platform, os.arch(), 'v' + pkg.version];
  var binBase = binBuild.join('-');
  var binName = (platform === 'win32') ? binBase + '.exe' : binBase;
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
    '.git/*'
  ];
  var jxCmd = [
    'jx package',
    'bin/kbox.js',
    'dist/' + binName,
    '--add "' + jxAddPatterns.join(',') + '"',
    '--slim "' + jxSlimPatterns.join(',') + '"',
    '--native'
  ];
  var installCmd = ['npm', 'install', '--production'];
  // Figure out whether we want to not version lock our build
  if (!grunt.option('dev')) {
    installCmd.push('&&');
    if (platform === 'win32') {
      installCmd.push('copy');
    }
    else {
      installCmd.push('cp');
    }
    installCmd.push('package.json');
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

  // setup task config
  var config = {

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
        src: 'build/dist/' + binNameExt,
        dest: 'dist/' + binNameExt,
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

    // Shell tasks
    shell: {
      // Shell tasks for building
      build: {
        options: {
          execOptions: {
            cwd: 'build',
            maxBuffer: 20 * 1024 * 1024
          }
        },
        command: buildCmds.join(' && ')
      },
      // Shell tasks for functional testing
      install: {
        options: shellOpts,
        command: funcCommand + ' ./test/install.bats'
      },
      cmd: {
        options: shellOpts,
        command: funcCommand + ' ./test/kalabox-cmd.bats'
      },
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
        prereleaseName: 'beta',
        metadata: '',
        regExp: false
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

  /*
   * Code tests
   */
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

  /*
   * Func tests
   */
  // Install verify tests
  grunt.registerTask('test:install', [
    'shell:install'
  ]);

  // kalabox-cmd tests
  grunt.registerTask('test:cmd', [
    'shell:cmd'
  ]);

  // All functional tests
  grunt.registerTask('test:func', [
    'test:install',
    'test:cmd'
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

  /*
   * Functional tests
   */
  // Verify the install
  grunt.registerTask('testinstall', [
    'shell:' + funcPlatform
  ]);

};
