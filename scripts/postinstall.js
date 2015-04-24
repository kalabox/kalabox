/**
 * Module to loosely coupled npm commands.
 * @module npm
 */

'use strict';

var config = require('./../lib/core/config.js');
var npm = require('./../lib/util/npm.js');

var defaultConfig = config.getDefaultConfig();
var pkgs = [];

// Grab our backends
pkgs.push(defaultConfig.engine);
pkgs.push(defaultConfig.services);
// Grab our apps
pkgs = pkgs.concat(defaultConfig.apps);
// Could easily add support for external plugins with something like below
// pkgs.concat(defaultConfig.externalPlugins);

npm.installPackages(defaultConfig.srcRoot, pkgs, function(err) {
  if (err) {
    console.log(err);
  } else {
    console.log('Installed additional backends and plugins.');
  }
});
