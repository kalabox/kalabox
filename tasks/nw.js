'use strict';

/**
 * This file/module contains all our nw based Grunt tasks
 */

// Find the NW path

module.exports = function() {

  /* Here are the NWJW options

    see: https://github.com/evshiron/nwjs-builder
    version: '0.14.5'
    platforms: ['osx64'],
    run: false,
    outputDir: dist/,
    outputName: kalabox,
    executableName: Kalabox.exe,
    outputFormat: DIR/ZIP,
    includes: otherfiles to add,
    withFFmpeg: false,
    sideBySide: false,
    production: rebuild deps,
    winIco: location of win icon,
    macIcns: location of osx icsn,
    mirror: grab nw bins from
  */

  return {

    /*
     * NW build and run tasks
     */
    run: {
      src: ['./build/gui'],
      options: {
        version: '0.14.6-sdk',
        run: true,
        winIco: './installer/win32/kalabox.ico',
        macIcns: './installer/osx/kalabox.icns'
      }
    },
    pkg: {
      src: ['./build/gui'],
      options: {
        version: '0.14.6',
        outputDir: './dist/gui',
        outputName: 'kalabox-ui',
        executableName: 'Kalabox',
        sideBySide: true,
        winIco: './installer/win32/kalabox.ico',
        macIcns: './installer/osx/kalabox.icns'
      }
    }

  };
};
