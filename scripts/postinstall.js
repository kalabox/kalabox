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

/*
 * Replaces the version part of a npm pkg@version string with
 * the master branch tarball from github.
 *
 * If you are using your own external app or plugin it needs to live on github
 * and have a master branch or this is not going to work.
 *
 */
var pkgToDev = function(pkg) {

  // Split our package so we can reassemble later
  var parts = pkg.split('@');

  // Get the tarball location
  return npm.getMasterTarball(parts[0])

  // Reassamble and return
  .then(function(tarPath) {
    return [parts[0], tarPath].join('@');
  });
};

// Grab our global config
var globalConfig = config.getGlobalConfig();

// Kick off an empty array
var pkgs = [];

// Grab our backends
pkgs.push(globalConfig.engine);
pkgs.push(globalConfig.services);

// Grab our apps
pkgs = pkgs.concat(globalConfig.apps);

// If we are in dev mode we need to grab the master branch of all our
// packages instead of the version given in config
if (globalConfig.devMode === true) {
  pkgs = _.map(pkgs, pkgToDev);
}

// Npm install our apps and backends
npm.installPackages(globalConfig.srcRoot, pkgs)

// Tell the world
.then(function() {
  // @todo: should we kenny loggins this?
  console.log('Installed additional backends and plugins.');
});
