/**
 * Module to loosely coupled npm commands.
 * @module npm
 */

'use strict';

// Node modules
var path = require('path');

// Npm mods
var Promise = require('bluebird');

// Some kbox dependencies
var shell = require('shelljs');
var yaml = require('./../lib/util/yaml.js');
var devMode = (process.env.KALABOX_DEV === 'true') ? true : false;

// Grab our global config
var installPackages = function(pkgs) {

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

  });

};

// Kick off an empty array
var pkgs = [];
// Code root
var srcRoot = path.resolve(__dirname, '..');
// Grab config file
var configFile = (devMode) ? 'development.yml' : 'kalabox.yml';
// Grab any external plugins
pkgs.push(yaml.toJson(path.join(srcRoot, configFile)).externalPlugins);
// Npm install our apps and backends
installPackages(pkgs)

.then(function() {
  console.log('Additional apps and backends installed.');
});
