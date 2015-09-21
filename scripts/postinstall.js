/**
 * Module to loosely coupled npm commands.
 * @module npm
 */

'use strict';

// Native mods
var path = require('path');
var url = require('url');

// Npm mods
var _ = require('lodash');
var fs = require('fs-extra');
var Promise = require('bluebird');

// Some kbox dependencies
var shell = require('./../lib/util/shell.js');
var config = require('./../lib/core/config.js');

// Grab our global config
var globalConfig = config.getGlobalConfig();

/*
 * We can't rely on Kalabox stuff in this file so we need to do this
 * to get the users home dir
 */
var getHomeDir = function() {

  // Check the env for the home path
  var platformIsWindows = process.platform === 'win32';
  var envKey = platformIsWindows ? 'USERPROFILE' : 'HOME';

  // Homeward bound
  return process.env[envKey];

};

/*
 * We can't rely on inited Kalabox stuff in this file since we
 * are going to use it in postinstall so we need to do this
 * to get dev mod
 */
var getDevMode = function() {

  // Set for usage later
  var devMode;

  // If the environment is a no go try to load from custom kalabox.json
  if (process.env.KALABOX_DEV === undefined) {

    // Construct kbox.json path
    var kboxJsonFile = path.join(getHomeDir(), '.kalabox', 'kalabox.json');

    // Check it kbox json exists
    if (fs.existsSync(kboxJsonFile)) {

      // Load it
      var kboxJson = require(kboxJsonFile);

      // Use its dev mode if its set
      devMode = (kboxJson.devMode) ? kboxJson.devMode : false;

    }
  }

  // Use the envvar if its set
  else {
    // Set it
    devMode = (process.env.KALABOX_DEV) ? process.env.KALABOX_DEV : false;
  }

  // Return something
  return devMode;

};

/*
 * Get the project tag/branch we should be pulling from
 */
var getProjectVersion = function(project) {

  // If we are in dev mode then grab
  if (getDevMode() === true || getDevMode() === 'true') {
    var vParts = globalConfig.version.split('.');
    return 'v' + [vParts[0], vParts[1]].join('.');
  }
  // If not we just return the version we already have
  else {
    var parts = project.split('@');
    return parts[1];
  }

};

/**
 * Returns a string with the url of the master branch
 * tarball. The package must be on github and have a repository
 * field in its pacakge.json. It must also have a master branch that is
 * considered the development branch on github.
 */
var getTarball = function(pkg, version) {

  // Build our tarball URL
  // https://github.com/kalabox/kalabox-plugin-dbenv/tarball/master
  var tarUrl = {
    protocol: 'https:',
    host: 'github.com',
    pathname: ['kalabox', pkg, 'tarball', version].join('/')
  };

  // Return the formatted tar URL
  return url.format(tarUrl);

};

/*
 * Replaces the version part of a npm pkg@version string with
 * the master branch tarball from github if that package is a kalabox
 * plugin
 *
 * If you are using your own external app or plugin it needs to live on github
 * and have a master branch or this is not going to work.
 *
 */
var pkgToDev = function(pkg, version) {

  // Split our package so we can reassemble later
  var parts = pkg.split('@');

  // Grab the dev tarball if ths is a kalabox plugin
  if (_.includes(pkg, 'kalabox-')) {

    // Get the tarball location
    var tar = getTarball(parts[0], version);
    return [parts[0], tar].join('@');

  }
  // Otherwise just return what we have
  else {
    return pkg;
  }

};

var installPackages = function(pkgs) {

  // Get our current dir so we can restore later
  var oldDir = process.cwd();

  // Change to the source root for our npm install
  process.chdir(globalConfig.srcRoot);

  // Go through each package, transform it
  return Promise.resolve(pkgs)

  // Install each pkg after we check whether we should grab dev mode or not
  .each(function(pkg) {

    // Figure out which version we should be trying to install
    var version = getProjectVersion(pkg);

    // If we need the dev branch do the transform
    if (version.charAt(0) === 'v') {
      pkg = pkgToDev(pkg, version);
    }

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

// Grab our backends
pkgs.push(globalConfig.engine);
pkgs.push(globalConfig.services);

// Grab our apps
pkgs = pkgs.concat(globalConfig.apps);

// Npm install our apps and backends
installPackages(pkgs)

.then(function() {
  console.log('Additional apps and backends installed.');
});
