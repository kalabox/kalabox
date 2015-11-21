/**
 * Module to determine if the target OS has a package installed
 * @module kbox.util.pkg
 */

'use strict';

// node modules
var path = require('path');

// npm modules
var _ = require('lodash');

// Kalabox modules
var shell = require('./shell.js');
var install = require('../install.js');
var Promise = require('../promise.js');

/*
 * Linux packager search helper
 */
var linuxSearchPackage = function(pkg) {
  // Return based on flavor
  switch (install.linuxOsInfo.getFlavor()) {
    case 'debian':
      return 'dpkg-query -f \'${binary:Package}\n\' -W | grep ' + pkg;
    case 'fedora':
      return 'rpm -qa | grep ' + pkg;
  }
};

/*
 * Helper function for linux
 */
var existsLinux = function(pkg) {

  // Get linux flavor
  var flavor = install.linuxOsInfo.getFlavor();

  // @todo: other flavors?
  if (flavor !== 'debian' && flavor !== 'fedora') {
    return Promise.resolve(false);
  }
  // Check to see if this package is already installed
  else {

    // Search the packages
    return Promise.fromNode(function(cb) {
      shell.exec(linuxSearchPackage(pkg), cb);
    })

    .catch(function(err) {
      // No results returns an error so we need to catch
    })

    // Parse the output
    .then(function(output) {

      // Define a null response
      if (output === undefined) {
        output = 'NO PACKAGE';
      }

      // Return result
      return _.contains(output.trim(), pkg);

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
 * Helpful escaping wizardry
 */
var esc = function(s) {
  if (process.platform === 'win32') {
    return s.replace(/ /g, '^ ');
  }
  if (process.platform === 'darwin') {
    var parts = s.split(path.sep);
    _.each(parts, function(part, key) {
      if (part.indexOf(' ') > -1) {
        parts[key] = '\\"' + part +  '\\"';
      }
    });
    return parts.join(path.sep);
  }
  else {
    return s.replace(/ /g, '\\ ');
  }
};

/*
 * Get fedora package manager
 */
var fedoraPkgManager = function() {

  // Get the linux version
  var info = install.linuxOsInfo.get();

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
  switch (install.linuxOsInfo.getFlavor()) {
    case 'debian': return ['apt-get', 'install', '-y', pkg].join(' ');
    case 'fedora': return [fedoraPkgManager(), 'install', '-y', pkg].join(' ');
  }
};

/*
 * Helper command to build darwin install command
 */
var installCmdDarwin = function(pkg, targetVolume) {
  return 'installer -verbose -pkg ' + esc(pkg) +
    ' -target ' + targetVolume;
};

/*
 * Helper command to build win32 install command
 */
var installCmdWin32 = function(pkg, inf) {
  // @todo: what if we have an MSI?
  return esc(pkg) +
    ' \'/SP /SILENT /VERYSILENT /SUPRESSMSGBOXES /NOCANCEL /NOREBOOT ' +
    '/NORESTART /CLOSEAPPLICATIONS /LOADINF="' + inf + '"\'';
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
  switch (install.linuxOsInfo.getFlavor()) {
    case 'debian': return ['apt-get', 'update', '-y'].join(' ');
    case 'fedora':
      // For right now we need to force exit code 0 because yum/dnf
      // will return exit code 100 when the index is refreshed but
      // updates are available
      // @todo: above is really bad and we should change it
      // return [fedoraPkgManager(), 'check-update', '-y'].join(' ');
      return [fedoraPkgManager(), 'check-update', '-y', '||', ':'].join(' ');
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
    var echo = ['deb', source, '$(lsb_release -cs)', 'contrib'].join(' ');
    var file = '/' + path.join('etc', 'apt', 'sources.list.d', 'kalabox.list');

    cmd.push(['echo', '"' + echo + '"', '>', file].join(' '));
    cmd.push(['wget -q', key, '-O-', '|', 'sudo apt-key add -'].join(' '));

    return cmd.join(' && ');

  };

  /*
   * Helper function to add fedora source
   * 'wget -O dest source'

   */
  var addFedoraSourceCmd = function(source) {

    // Define key path
    var keyDir = '/' + path.join('etc', 'yum.repos.d');

    // Build it up
    return ['wget -O', path.join(keyDir, 'kalabox.repo'), source].join(' ');

  };

  // Return based on flavor
  switch (install.linuxOsInfo.getFlavor()) {
    case 'debian': return addDebianSourceCmd(source, key);
    case 'fedora': return addFedoraSourceCmd(source);
  }

};
