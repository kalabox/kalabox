'use strict';

/**
 * Some helpers for the engine installer
 */

module.exports = function(kbox) {

  // Native modules
  var path = require('path');

  // Npm modules
  var fs = require('fs-extra');
  var _ = require('lodash');

  // Kalabox modules
  var meta = require('./meta.js');
  var config = kbox.core.deps.get('globalConfig');

  // B2D
  var b2d = require('./b2d.js')(kbox);

  /*
   * Return some info about the current state of the kalabox installation
   */
  var getCurrentInstall = function() {

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
    if (_.isEmpty(currentInstall) || !currentInstall[prop]) {
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
   * Helper function to assess whether we need a new B2D
   */
  var needsB2D = function() {
    return getProUp('PROVIDER_B2D_VERSION');
  };

  /*
   * Helper function to assess whether we need to grab a new profile
   */
  var needsProfile = function() {
    return getProUp('PROVIDER_PROFILE_VERSION');
  };

  /*
   * Helper function to assess whether we need to grab a new inf
   */
  var needsInf = function() {
    return getProUp('PROVIDER_INF_VERSION');
  };

  /*
   * Helper function to assess whether we need to grab a new vb
   */
  var needsVB = function() {
    return getProUp('PROVIDER_VB_VERSION');
  };

  /*
   * Helper function to assess whether we need to grab downloads
   */
  var needsDownloads = function() {
    return needsVB() || needsInf() || needsProfile() || needsB2D();
  };

  /*
   * Helper function to assess whether we need to add in commands
   */
  var needsAdminCommands = function() {
    return needsVB() || needsB2D();
  };

  /*
   * Helper function to determine whether we need to run linux DNS commands
   */
  var needsB2DIsoUpdate = function() {

    // Get some state info
    var neverUpdated = getCurrentInstall().PROVIDER_B2D_ISO === undefined;
    var hasB2D = getCurrentInstall().PROVIDER_B2D_VERSION !== undefined;

    if (!hasB2D) {
      // Return false if this is our first provision.
      return false;
    } else if (neverUpdated) {
      // Return true if we've never updated before
      return true;
    }

    // Otherwise return our normal compare
    return getProUp('PROVIDER_B2D_ISO') ;

  };

  /*
   * Helper function to assess whether we need to grab a new vb
   */
  var installProfile = function(state) {

    // Get profile location and make sure it exists
    fs.mkdirpSync(state.config.sysProviderRoot);

    // Get temp path
    var downloadDir = kbox.util.disk.getTempDir();

    // Get source and destination
    var src = path.join(downloadDir, path.basename(meta.PROVIDER_PROFILE_URL));
    var dest = path.join(state.config.sysProviderRoot, 'profile');

    // Copy the profile over to the right spot
    fs.renameSync(src, dest);

    // debug
    state.log.debug('INSTALLING PROFILE FROM => ' + src);
    state.log.debug('INSTALLING PROFILE TO => ' + dest);

  };

  /*
   * As of 0.10.3 we now set up separate ssh keys specifically for kalabox
   * during `boot2docker init`. This is a small step to migrate older users
   * to the new key format.
   */
  var updateKeys = function(state) {

    // Try to grab the current install
    var currentInstall = getCurrentInstall();

    // If we haven't installed before or have already updated keys then we
    // should be good to go
    if (_.isEmpty(currentInstall) || currentInstall.PROVIDER_B2D_KEYS) {
      return true;
    }

    // Get info about old keys
    var oldSshKey = 'id_boot2docker';
    var oldPrivateKey = path.join(config.home, '.ssh', oldSshKey);
    var oldPublicKey = path.join(config.home, '.ssh', oldSshKey + '.pub');

    // Check to see if we have old B2D keys
    if (!fs.existsSync(oldPrivateKey) || !fs.existsSync(oldPublicKey)) {
      state.log.info('COULD NOT FIND OLD B2D KEYS => ' + oldPrivateKey);
      return false;
    }

    // Get info about new keys
    var newSshKey = b2d.sshKey;
    console.log(b2d.sshKey);
    var newPrivateKey = path.join(config.home, '.ssh', newSshKey);
    var newPublicKey = path.join(config.home, '.ssh', newSshKey + '.pub');

    // Copy old B2D keys over to the new spot
    fs.copySync(oldPrivateKey, newPrivateKey, {clobber: true});
    fs.copySync(oldPublicKey, newPublicKey, {clobber: true});

    // Helpful output
    var sshKeyPairs = [
      {old: oldPrivateKey, new: newPrivateKey},
      {old: oldPublicKey, new: newPublicKey},
    ];
    _.forEach(sshKeyPairs, function(pair) {
      var msg = ['COPYING OLD KEY FROM', pair.old, 'TO', pair.new];
      state.log.debug(msg.join(' '));
    });

    // Looks like we succeeded
    return true;

  };

  /*
   * Helper function to assess whether we need to grab a new vb
   */
  var installB2DLinux = function(state) {

    // Get temp path
    var downloadDir = kbox.util.disk.getTempDir();

    // Get the b2d bin location
    var b2d = meta.PROVIDER_DOWNLOAD_URL.linux.b2d;
    var b2dBin = path.join(downloadDir, path.basename(b2d));

    // Destination path
    var sysConfRoot = kbox.core.deps.get('config').sysConfRoot;
    var b2dBinDest = path.join(sysConfRoot, 'bin', 'boot2docker');

    // Need to do it this way if the user is moving a file across
    // partitions
    var is = fs.createReadStream(b2dBin);
    var os = fs.createWriteStream(b2dBinDest);
    is.pipe(os);

    // debug
    state.log.debug('INSTALLING B2DBIN FROM => ' + b2dBin);
    state.log.debug('INSTALLING B2DBIN TO => ' + b2dBinDest);

    // Execute perm on complete
    is.on('end', function() {
      fs.chmodSync(b2dBinDest, '0755');
    });

  };

  return {
    needsDownloads: needsDownloads,
    needsB2DIsoUpdate: needsB2DIsoUpdate,
    needsAdminCommands: needsAdminCommands,
    needsVB: needsVB,
    needsInf: needsInf,
    needsProfile: needsProfile,
    needsB2D: needsB2D,
    updateKeys: updateKeys,
    installProfile: installProfile,
    installB2DLinux: installB2DLinux
  };

};
