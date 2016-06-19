'use strict';

/**
 * This file/module contains helpful copy and clean tasks.
 */

module.exports = function(common) {

  // Define cli pkg name
  var cliPkgName = 'kbox-' + common.kalabox.pkgSuffix;

  return {
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
      }
    },
    clean: {
      cli: {
        build: ['build/cli'],
        dist: ['dist/cli']
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
