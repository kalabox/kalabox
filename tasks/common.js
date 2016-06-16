'use strict';

/**
 * @file
 * This file/module contains common things needed by many tasks.
 */

// Grab needed dataz
var os = require('os');
var pkg = require('./../package.json');

// System info
var system = {
  platform: (process.platform !== 'darwin') ? process.platform : 'osx',
  arch: os.arch(),
};

// Kalabox info
var version = pkg.version;
var pkgType = [system.platform, system.arch, 'v' + version].join('-');
var pkgExt = (system.platform === 'win32') ? '.exe' : '';
var pkgSuffix = pkgType + pkgExt;

// All JS files
var jsFiles = [
  'Gruntfile.js',
  'bin/kbox.js',
  'lib/**/*.js',
  'tasks/**/*.js',
  'test/**/*.js',
  'plugins/**/*.js',
  'plugins/**/**/*.js',
  'plugins/**/**/**/*.js',
  'scripts/*.js'
];

// CLI Build assets
var cliBuildFiles = [
  'bin/kbox.*',
  'lib/**',
  'plugins/**',
  '*.json',
  'kalabox.yml'
];

// Files to add to JX package
var jxAddFiles = [
  '*.js',
  '*.yml',
  '*.json',
  '*.cmd',
  '*.vbs',
  'version.lock'
];

// Files to exclude to JX package
var jxSlimFiles = [
  '*.spec',
  '*test/*',
  '.git/*'
];

// Mocha unit tests
var mochaTestFiles = [
  './test/*.spec.js',
  './test/**/*.spec.js'
];

// CLI BATS tests
var cliBatsFiles = [
  './test/cli/install.bats',
  './test/cli/cmd.bats'
];

// Linux installer BATS tests
var installerLinuxBatsFiles = [
  './test/installer/basic.bats',
  './test/installer/linux/*.bats'
];

// Osx installer BATS tests
var installerOsxBatsFiles = [
  './test/installer/basic.bats',
  './test/installer/osx/*.bats'
];

// Return our objects
module.exports = {
  system: system,
  kalabox: {
    version: version,
    pkgType: pkgType,
    pkgExt: pkgExt,
    pkgSuffix: pkgSuffix
  },
  files: {
    cli: cliBuildFiles,
    cliBats: cliBatsFiles,
    installerOsxBats: installerOsxBatsFiles,
    installerLinuxBats: installerLinuxBatsFiles,
    js: jsFiles,
    jxAdd: jxAddFiles,
    jxSlim: jxSlimFiles,
    mochaTests: mochaTestFiles
  }
};
