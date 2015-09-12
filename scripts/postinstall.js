/**
 * Module to loosely coupled npm commands.
 * @module npm
 */

'use strict';

// Npm mods
var _ = require('lodash');

// Some kbox dependencies
var config = require('./../lib/core/config.js');
var npm = require('./../lib/util/npm.js');

// Grab our global config
var globalConfig = config.getGlobalConfig();

// Kick off an empty array
var pkgs = [];

// Grab our backends
pkgs.push(globalConfig.engine);
pkgs.push(globalConfig.services);

// Grab our apps
pkgs = pkgs.concat(globalConfig.apps);

// Npm install our apps and backends
npm.installPackages(globalConfig.srcRoot, pkgs)

// Tell the world
.then(function() {
  // @todo: should we kenny loggins this?
  console.log('Installed additional backends and plugins.');
});
