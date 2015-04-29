/**
 * Module to loosely coupled npm commands.
 * @module npm
 */

'use strict';

var config = require('./../lib/core/config.js');
var npm = require('./../lib/util/npm.js');

var globalConfig = config.getGlobalConfig();
var pkgs = [];

// Grab our backends
pkgs.push(globalConfig.engine);
pkgs.push(globalConfig.services);
// Grab our apps
pkgs = pkgs.concat(globalConfig.apps);
// Could easily add support for external plugins with something like below
// pkgs.concat(defaultConfig.externalPlugins);

npm.installPackages(globalConfig.srcRoot, pkgs, function(err) {
  if (err) {
    console.log(err);
  } else {
    console.log('Installed additional backends and plugins.');
  }
});
