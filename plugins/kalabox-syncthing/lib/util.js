'use strict';

/**
 * Some helpers for the syncthing installer
 */

module.exports = function(kbox) {

  // Native modules
  var path = require('path');

  // Npm modules
  var fs = require('fs-extra');

  // Kalabox modules
  var provisioned = kbox.core.deps.get('globalConfig').provisioned;
  var install = kbox.install;

  // Get and load the install config
  var config = kbox.util.yaml.toJson(path.join(__dirname, 'config.yml'));

  /*
   * Helper function to assess whether we need to grab a new syncthing image
   */
  var needsImgUp = function() {
    return install.getProUp('SYNCTHING_IMAGE', config.image);
  };

  /*
   * Helper function to assess whether we need to grab a new syncthing image
   */
  var needsBinUp = function() {
    return install.getProUp('SYNCTHING_BINARY', config.binary);
  };

  /*
   * Helper function to assess whether we need to grab new syncthing config
   */
  var needsConfig = function() {
    return install.getProUp('SYNCTHING_CONFIG', config.config);
  };

  /*
   * Helper fucntion to assesss whether we need to grab downloads
   */
  var needsDownloads = function() {
    return this.needsBinUp() || this.needsImgUp();
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
    if (!provisioned && this.needsDownloads()) {
      var configFile = path.basename(config.configfile);
      var src = path.join(tmp, configFile);
      fs.renameSync(src, path.join(syncthingDir, configFile));
    }

    // Get OS specific extracted folder
    var downloadURL = config.pkg[process.platform];
    var ext = (process.platform === 'win32') ? '.zip' : '.tar.gz';
    var extractedDir = path.join(tmp, path.basename(downloadURL, ext));

    // Get binary location
    var bin = (process.platform === 'win32') ? 'syncthing.exe' : 'syncthing';
    var binaryPath = path.join(extractedDir, bin);

    // Ensure our kalabox binary directory exists
    var binDir = path.join(sysConfRoot, 'bin');
    fs.mkdirpSync(binDir);

    // Move the binary over
    kbox.core.log.debug('MOVING BINARY FROM => ' + binaryPath);
    kbox.core.log.debug('MOVING BINARY TO => ' + path.join(binDir, bin));
    fs.renameSync(binaryPath, path.join(binDir, bin));

    // Give the binary the correct x permissions
    fs.chmodSync(path.join(binDir, bin), '0755');

  };

  return {
    needsBinUp: needsBinUp,
    needsImgUp: needsImgUp,
    needsConfig: needsConfig,
    needsDownloads: needsDownloads,
    installSyncthing: installSyncthing
  };

};
