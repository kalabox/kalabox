'use strict';

/**
 * Some helpers for the engine installer
 */

module.exports = function(kbox) {

  // Native modules
  var path = require('path');

  // Npm modules
  var fs = require('fs-extra');

  // Kalabox modules
  var install = kbox.install;

  // Provider config
  var providerConfigFile = path.resolve(__dirname, 'config.yml');
  var providerConfig = kbox.util.yaml.toJson(providerConfigFile);

  // Configs
  var VIRTUALBOX_CONFIG = providerConfig.virtualbox;
  var MACHINE_CONFIG = providerConfig.machine;
  var COMPOSE_CONFIG = providerConfig.compose;
  var MSYSGIT_CONFIG = providerConfig.mysysgit;

  /*
   * Helper function to assess whether we need a new B2D
   */
  var needsMachine = function() {
    return install.getProUp('PROVIDER_MACHINE_VERSION', MACHINE_CONFIG.version);
  };

  /*
   * Helper function to assess whether we need a new B2D
   */
  var needsCompose = function() {
    return install.getProUp('PROVIDER_COMPOSE_VERSION', COMPOSE_CONFIG.version);
  };

  /*
   * Helper function to assess whether we need to grab a new vb
   */
  var needsVB = function() {
    return install.getProUp('PROVIDER_VB_VERSION', VIRTUALBOX_CONFIG.version);
  };

  /*
   * Helper function to assess whether we need to grab a new vb
   */
  var needsMsysgit = function() {
    return install.getProUp('PROVIDER_MSYSGIT_VERSION', MSYSGIT_CONFIG.version);
  };

  /*
   * Helper function to assess whether we need to grab downloads
   */
  var needsDownloads = function() {
    return needsVB() || needsMachine() || needsCompose() || needsMsysgit();
  };

  /*
   * Helper function to assess whether we need to add in commands
   */
  var needsAdminCommands = function() {
    return needsVB() || needsMsysgit();
  };

  /*
   * Helper function to determine whether we need to run linux DNS commands
   */
  var needsKalaboxIsoUpdate = function() {

    // Get some state info
    var currentInstall = install.getCurrentInstall();
    var neverUpdated = currentInstall.PROVIDER_KALABOX_ISO === undefined;
    var hasMachine = currentInstall.PROVIDER_MACHINE_VERSION !== undefined;

    if (!hasMachine) {
      // Return false if this is our first provision.
      return false;
    } else if (neverUpdated) {
      // Return true if we've never updated before
      return true;
    }

    // Otherwise return our normal compare
    return install.getProUp('PROVIDER_KALABOX_ISO', MACHINE_CONFIG.isoversion);

  };

  /*
   * Helper function to assess whether we need to grab a new vb
   */
  var installMachine = function(state) {

    // Source path
    var downloadDir = kbox.util.disk.getTempDir();
    var srcFile = MACHINE_CONFIG.pkg[process.platform];

    // Destination path
    var sysConfRoot = kbox.core.deps.get('config').sysConfRoot;
    var machineBinDest = path.join(sysConfRoot, 'bin');
    var destFile = 'docker-machine';
    var destExt = (process.platform === 'win32') ? '.exe' : '';

    // Move the dm over to the kbox bin location
    var source = path.join(downloadDir, path.basename(srcFile));
    var dest = path.join(machineBinDest, destFile + destExt);
    state.log.debug('INSTALLING ' + source + ' FROM => ' + downloadDir);
    fs.copySync(source, dest, {clobber: true});
    state.log.debug('INSTALLED ' + dest + ' TO => ' + machineBinDest);

    // Make executable
    fs.chmodSync(dest, '0755');

  };

  /*
   * Helper function to assess whether we need to grab a new vb
   * @todo: this is essentially the same as installMachine
   */
  var installCompose = function(state) {

    // Source path
    var downloadDir = kbox.util.disk.getTempDir();
    var srcFile = COMPOSE_CONFIG.pkg[process.platform];

    // Destination path
    var sysConfRoot = kbox.core.deps.get('config').sysConfRoot;
    var machineBinDest = path.join(sysConfRoot, 'bin');
    var destFile = 'docker-compose';
    var destExt = (process.platform === 'win32') ? '.exe' : '';

    // Move the dm over to the kbox bin location
    var source = path.join(downloadDir, path.basename(srcFile));
    var dest = path.join(machineBinDest, destFile + destExt);
    state.log.debug('INSTALLING ' + source + ' FROM => ' + downloadDir);
    fs.copySync(source, dest, {clobber: true});
    state.log.debug('INSTALLED ' + dest + ' TO => ' + machineBinDest);

    // Make executable
    fs.chmodSync(dest, '0755');

  };

  return {
    needsDownloads: needsDownloads,
    needsKalaboxIsoUpdate: needsKalaboxIsoUpdate,
    needsAdminCommands: needsAdminCommands,
    needsVB: needsVB,
    needsMsysgit: needsMsysgit,
    needsMachine: needsMachine,
    needsCompose: needsCompose,
    installMachine: installMachine,
    installCompose: installCompose
  };

};
