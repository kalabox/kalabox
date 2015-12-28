/**
 * Module to loosely coupled npm commands.
 * @module npm
 */

'use strict';

// Npm mods
var Promise = require('bluebird');

// Some kbox dependencies
var shell = require('./../lib/util/shell.js');
var config = require('./../lib/core/config.js');

// Grab our global config
var globalConfig = config.getGlobalConfig();

var installPackages = function(pkgs) {

  // Get our current dir so we can restore later
  var oldDir = process.cwd();

  // Change to the source root for our npm install
  process.chdir(globalConfig.srcRoot);

  // Go through each package, transform it
  return Promise.resolve(pkgs)

  // Install each pkg after we check whether we should grab dev mode or not
  .each(function(pkg) {

    // Debug log the package
    console.log(pkg);

    // Install our packages
    return Promise.fromNode(function(callback) {
      shell.exec(['npm', 'install', pkg].join(' '), callback);
    });

  })

  .then(function() {
    // Return back to where we started
    process.chdir(oldDir);
  });

};

// Kick off an empty array
var pkgs = [];

// Grab any external plugins
pkgs.push(globalConfig.externalPlugins);

// Npm install our apps and backends
installPackages(pkgs)

.then(function() {
  console.log('Additional apps and backends installed.');
});
