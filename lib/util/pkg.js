/**
 * Module to determine if the target OS has a package installed
 * @module kbox.util.pkg
 */

'use strict';

// node modules
var path = require('path');

// npm modules
var _ = require('lodash');
var esc = require('shell-escape');

// Kalabox modules
var shell = require('./shell.js');
var util = require('../util.js');
var Promise = require('../promise.js');

/*
 * Linux packager search helper
 */
var getPackages = function() {

  // Return based on flavor
  switch (util.linux.getFlavor()) {
    case 'debian': return ['dpkg-query', '-f', '${binary:Package}\n', '-W'];
    case 'fedora': return ['rpm', '-qa'];
  }
};

/*
 * Helper function for linux
 */
var existsLinux = function(pkg) {

  // Get linux flavor
  var flavor = util.linux.getFlavor();

  // @todo: other flavors?
  if (flavor !== 'debian' && flavor !== 'fedora') {
    return Promise.resolve(false);
  }
  // Check to see if this package is already installed
  else {

    // Search the packages
    return shell.exec(getPackages())

    // Parse the output
    .then(function(output) {

      // Return result
      return _.includes(output.split('\n'), pkg);

    });
  }
};

/**
 * Returns whether a package exists or not
 * @todo: get to work on things other than debian
 * @arg {string} package - The package to check
 */
exports.exists = function(pkg) {

  // Return path based on platform
  switch (process.platform) {
    case 'win32': return Promise.resolve(false);
    case 'darwin': return Promise.resolve(false);
    case 'linux': return existsLinux(pkg);
  }

};

/*
 * Get fedora package manager
 */
var fedoraPkgManager = function() {

  // Get the linux version
  var info = util.linux.get();

  // Return either dnf or yum depending on the fedora version
  if (info.VERSION_ID < 22) {
    return 'yum';
  }
  else {
    return 'dnf';
  }
};

/*
 * Helper command to build linux install command
 */
var installCmdLinux = function(pkg) {

  // Return based on flavor
  switch (util.linux.getFlavor()) {
    case 'debian': return esc(['apt-get', 'install', '-y', pkg]);
    case 'fedora': return esc([fedoraPkgManager(), 'install', '-y', pkg]);
  }
};

/*
 * Helper command to build darwin install command
 */
var installCmdDarwin = function(pkg, targetVolume) {
  return esc(['installer', '-verbose', '-pkg', pkg, '-target', targetVolume]);
};

/*
 * Helper command to build win32 install command
 */
var installCmdWin32 = function(pkg, options) {

  // Start the command collector
  var cmd = [];

  // Prefix with appropriate tools if we have a msi
  if (path.extname(pkg) === '.msi') {
    var msiexec = path.join(process.env.SystemRoot, 'system32', 'msiexec.exe');
    cmd.unshift('/i');
    cmd.unshift(msiexec);
  }

  // Add in our file
  cmd.push(pkg);

  // Add in relevant options if we have them
  if (!_.isEmpty(options)) {
    cmd = cmd.concat(options);
  }

  // Return the whole jam
  return esc(cmd);

};

/**
 * Returns an install command string for a package
 * @arg {string} package - The package to install
 * @arg {string} data - Additional info for the package
 */
exports.installCmd = function(pkg, data) {

  // Return path based on platform
  switch (process.platform) {
    case 'win32': return installCmdWin32(pkg, data);
    case 'darwin': return installCmdDarwin(pkg, data);
    case 'linux': return installCmdLinux(pkg);
  }

};

/**
 * Returns a command to refresh sources
 * NOTE: LINUX ONLY
 * @arg {string} source - The source location
 * @arg {string} key - Optional key
 */
exports.refreshSourcesCmd = function() {

  // Return based on flavor
  switch (util.linux.getFlavor()) {
    case 'debian': return esc(['apt-get', 'update', '-y']);
    case 'fedora':
      // For right now we need to force exit code 0 because yum/dnf
      // will return exit code 100 when the index is refreshed but
      // updates are available
      // @todo: above is really bad and we should change it
      // return [fedoraPkgManager(), 'check-update', '-y'].join(' ');
      return esc([fedoraPkgManager(), 'check-update', '-y', '||', ':']);
  }

};

/**
 * Returns a command to add a source
 * NOTE: LINUX ONLY
 * @arg {string} source - The source location
 * @arg {string} key - Optional key
 */
exports.addSourceCmd = function(source, key) {

  /*
   * Helper function to add debian source
   * 'echo "deb SOURCE $(lsb_release -cs) contrib" > /etc/apt/sources.list.d/kalabox.list'
   * 'wget -q KEY -O- | sudo apt-key add -';
   */
  var addDebianSourceCmd = function(source, key) {

    // Start the cmd off
    var cmd = [];

    // Construct the pieces
    var echo = esc(['deb', source, '$(lsb_release -cs)', 'contrib']);
    var file = '/' + path.join('etc', 'apt', 'sources.list.d', 'kalabox.list');

    cmd = cmd.concat(['echo', '"' + echo + '"', '>', file]);
    cmd.push('&&');
    cmd = cmd.concat(['wget -q', key, '-O-', '|', 'sudo apt-key add -']);

    return esc(cmd);

  };

  /*
   * Helper function to add fedora source
   * 'wget -O dest source'

   */
  var addFedoraSourceCmd = function(source) {

    // Define key path
    var keyDir = '/' + path.join('etc', 'yum.repos.d');

    // Build it up
    return esc(['wget -O', path.join(keyDir, 'kalabox.repo'), source]);

  };

  // Return based on flavor
  switch (util.linux.getFlavor()) {
    case 'debian': return addDebianSourceCmd(source, key);
    case 'fedora': return addFedoraSourceCmd(source);
  }

};
