'use strict';

/**
 * @file
 * This file/module contains common things needed by many tasks.
 */

// Grab needed dataz
var pkg = require('./../package.json');

// System info
var system = {
  platform: (process.platform !== 'darwin') ? process.platform : 'osx'
};

// Kalabox info
var version = pkg.version;
var pkgType = [system.platform, 'x64', 'v' + version].join('-');
var pkgExt = (system.platform === 'win32') ? '.exe' : '';
var pkgSuffix = pkgType + pkgExt;

// Other helpers
var vendorDir = 'src/lib/vendor/';

// All CLI js Files
var cliJsFiles = [
  'bin/kbox.js',
  'lib/**/*.js',
  'plugins/**/*.js',
  'plugins/**/**/*.js',
  'plugins/**/**/**/*.js'
];

// All GUI js Files
var guiJsFiles = [
  'src/**/*.js',
  '!src/lib/vendor/**/*',
  '!src/modules/**/*.spec.js',
];

// All auxilary js Files
var auxJsFiles = [
  '*.js',
  'tasks/**/*.js',
  'test/**/*.js',
  'src/modules/**/*.spec.js'
];

// All html templates
var htmlTplFiles = [
  'src/**/*.html.tmpl'
];

// All html files
var htmlFiles = [
  'src/**/*.html'
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

// Linux installer BATS tests
var installerLinuxBatsFiles = [
  './test/installer/install.bats',
  './test/installer/linux/*.bats'
];

// Osx installer BATS tests
var installerOsxBatsFiles = [
  './test/installer/install.bats',
  './test/installer/osx/*.bats'
];

// Our vendor JS files
var vendorJsFiles = [
  vendorDir + 'bluebird/js/browser/bluebird.js',
  vendorDir + 'jquery/dist/jquery.js',
  vendorDir + 'd3/d3.js',
  vendorDir + 'angular-ui-utils/modules/route/route.js',
  vendorDir + 'angular/angular.js',
  vendorDir + 'angular-ui-router/release/angular-ui-router.min.js',
  vendorDir + 'angular-bootstrap/ui-bootstrap.min.js',
  vendorDir + 'angular-bootstrap/ui-bootstrap-tpls.min.js',
  vendorDir + 'angular-bluebird-promises/dist/angular-bluebird-promises.js',
  vendorDir + 'jasny-bootstrap/dist/js/jasny-bootstrap.min.js',
  vendorDir + 'angular-ui-switch/angular-ui-switch.min.js'
];

// Our vendor CSS files
var vendorCssFiles = [
  vendorDir + 'font-awesome/css/font-awesome.min.css',
  vendorDir + 'angular-ui-switch/angular-ui-switch.min.css',
  vendorDir + 'loaders.css/loaders.min.css'
];

var vendorAssetFiles = [
  vendorDir + 'font-awesome/fonts/fontawesome-webfont.woff',
  vendorDir + 'font-awesome/fonts/fontawesome-webfont.ttf'
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
    auxJs: auxJsFiles,
    cli: cliBuildFiles,
    cliJs: cliJsFiles,
    guiJs: guiJsFiles,
    html: htmlFiles,
    htmlTpl: htmlTplFiles,
    installerOsxBats: installerOsxBatsFiles,
    installerLinuxBats: installerLinuxBatsFiles,
    jxAdd: jxAddFiles,
    jxSlim: jxSlimFiles,
    mochaTests: mochaTestFiles,
    vendorAssets: vendorAssetFiles,
    vendorCss: vendorCssFiles,
    vendorJs: vendorJsFiles
  }
};
