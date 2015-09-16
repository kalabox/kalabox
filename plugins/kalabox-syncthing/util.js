'use strict';

/**
 * Some helpers for the syncthing installer
 */

module.exports = function(kbox) {

  // Native modules
  var path = require('path');

  // Npm modules
  var fs = require('fs-extra');
  var _ = require('lodash');

  // Kalabox modules
  var meta = require('./meta.js');
  var packed = kbox.core.deps.get('prepackaged');
  var config = kbox.core.deps.get('globalConfig');
  var provisioned = config.provisioned;

  /*
   * Return some info about the current state of the kalabox installation
   */
  var getCurrentInstall = function(installDetails) {

    // This is where our current install file should live
    var cIF = path.join(config.sysConfRoot, 'installed.json');

    // If the file exists use that if not empty object
    var currentInstall = (fs.existsSync(cIF)) ? require(cIF) : {};

    return currentInstall;

  };

  /*
   * Helper function to grab and compare a meta prop
   */
  var getProUp = function(prop) {

    // Get details about the state of the current installation
    var currentInstall = getCurrentInstall();

    // This is the first time we've installed so we def need
    if (_.isEmpty(currentInstall)) {
      return true;
    }

    // We have a syncversion to compare
    // @todo: is diffence a strong enough check?
    var nV = meta[prop];
    if (currentInstall[prop] && (currentInstall[prop] !== nV)) {
      return true;
    }

    // Hohum i guess we're ok
    return false;

  };

  /*
   * Helper function to assess whether we need to grab a new syncthing image
   */
  var needsImgUp = function() {
    return getProUp('SYNCTHING_IMAGE');
  };

  /*
   * Helper function to assess whether we need to grab a new syncthing image
   */
  var needsBinUp = function() {
    return getProUp('SYNCTHING_BINARY');
  };

  /*
   * Helper function to install the syncthing binary
   */
  var installSyncthing = function(sysConfRoot) {

    // Get the download location.
    var tmp = kbox.util.disk.getTempDir();

    // Make sure the syncthing directory exists first
    var syncthingDir = path.join(sysConfRoot, 'syncthing');
    fs.mkdirpSync(syncthingDir);

    // Move config from download location to the correct location if this
    // is a valid update move
    if ((!packed && !provisioned) && (this.needsBinUp || this.needsImgUp)) {
      var config = path.join(tmp, path.basename(meta.SYNCTHING_CONFIG_URL));
      fs.renameSync(config, path.join(syncthingDir, path.basename(config)));
    }

    // Get OS specific extracted folder
    var downloadURL = meta.SYNCTHING_DOWNLOAD_URL[process.platform];
    var ext = (process.platform === 'win32') ? '.zip' : '.tar.gz';
    var extractedDir = path.join(tmp, path.basename(downloadURL, ext));

    // Get binary location
    var bin = (process.platform === 'win32') ? 'syncthing.exe' : 'syncthing';
    var binaryPath = path.join(extractedDir, bin);

    // Ensure our kalabox binary directory exists
    var binDir = path.join(sysConfRoot, 'bin');
    fs.mkdirpSync(binDir);

    // Move the binary over
    fs.renameSync(binaryPath, path.join(binDir, bin));

    // Give the binary the correct permissions
    fs.chmodSync(path.join(binDir, bin), '0755');

  };

  return {
    needsBinUp: needsBinUp,
    needsImgUp: needsImgUp,
    installSyncthing: installSyncthing
  };

};
