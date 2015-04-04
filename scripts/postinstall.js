/**
 * Module to loosely coupled npm commands.
 * @module npm
 */

'use strict';

var config = require('./../lib/core/config.js');
var npm = require('./../lib/util/npm.js');
var defaultConfig = config.getDefaultConfig();
var pkgs = [];

pkgs.push(defaultConfig.engine);
pkgs.push(defaultConfig.services);
pkgs = pkgs.concat(defaultConfig.globalPlugins);

npm.installPackages(pkgs, function(err) {
  if (err) {
    console.log(err);
  } else {
    console.log('Installed additional backends and plugins.');
  }
});
