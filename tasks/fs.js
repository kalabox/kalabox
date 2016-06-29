'use strict';

/**
 * This file/module contains helpful copy and clean tasks.
 */

module.exports = function(common) {

  // Define cli pkg name
  var cliPkgName = 'kbox-' + common.kalabox.pkgSuffix;

  return {

    // Our copy tasks
    copy: {
      cli: {
        build: {
          src: common.files.cli,
          dest: 'build/cli/'
        },
        dist: {
          src: 'build/cli/' + cliPkgName,
          dest: 'dist/cli/' + cliPkgName,
          options: {
            mode: true
          }
        }
      },
      installer: {
        build: {
          cwd: 'installer/' + common.system.platform,
          src: ['**'],
          dest: 'build/installer',
          expand: true,
          options: {
            mode: true
          }
        },
        dist: {
          cwd: 'build/installer/dist',
          src: ['**'],
          dest: 'dist/',
          expand: true,
          options: {
            mode: true
          }
        }
      },
      gui: {
        build: {
          options: {
            noProcess: ['**/*.{png,gif,jpg,ico,psd,svg,ttf,otf,woff,' +
            'woff2,eot}'],
            process: function(content, srcPath) {
              switch (srcPath) {
                // Switch CLI entrypoint to NWJS one
                case 'package.json':
                  return content.replace(
                    '"main": "lib/kbox.js"',
                    '"main": "index.html"'
                  );
                // Return the same
                default:
                  return content;
              }
            }
          },
          files: [
            {
              src: ['**'],
              dest: 'build/gui/images/',
              cwd: 'src/images',
              expand: true
            },
            {
              src: ['package.json'],
              dest: 'build/gui/package.json',
            },
            {
              src: ['**'],
              dest: 'build/gui/fonts/',
              cwd: 'src/lib/vendor/font-awesome/fonts',
              expand: true
            },
            {
              src: ['**'],
              dest: 'build/gui/lib',
              cwd: 'lib',
              expand: true
            },
            {
              src: ['**'],
              dest: 'build/gui/plugins',
              cwd: 'plugins',
              expand: true
            },
            {
              src: ['kalabox.yml'],
              dest: 'build/gui/kalabox.yml'
            },
            {
              src: common.files.guiJs,
              dest: 'build/gui',
              cwd: '.',
              expand: true
            },
            {
              src: common.files.vendorJs,
              dest: 'build/gui',
              cwd: '.',
              expand: true
            },
            {
              src: common.files.vendorCss,
              dest: 'build/gui',
              cwd: '.',
              expand: true
            }
          ]
        }
      }
    },

    // Our clean tasks
    clean: {
      cli: {
        build: ['build/cli'],
        dist: ['dist/cli']
      },
      gui: {
        build: ['build/gui'],
        dist: ['dist/gui']
      },
      installer: {
        build: ['build/installer'],
        dist: [
          'dist/*.exe',
          'dist/*.dmg',
          'dist/*.rpm',
          'dist/*.deb'
        ]
      }
    }
  };

};
