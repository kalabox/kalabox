/**
 * Contains binary handling suff
 * @module machine.bin
 */

'use strict';

module.exports = function(kbox) {

  // Node modules
  var path = require('path');

  // NPM modules
  var _ = require('lodash');

  // Kalabox modules
  var Promise = kbox.Promise;
  var meta = require('./../meta.js');

  /*
   * Get directory for machine executable.
   */
  var getMachineBinPath = function() {

    // Get sysconf
    var sysConfRoot = kbox.core.deps.get('config').sysConfRoot;
    return path.join(sysConfRoot, 'bin');

  };

  /*
   * Return the machine executable location
   */
  var getMachineExecutable = function() {

    // Get machine bin path
    var machinePath = getMachineBinPath();
    var machineBin = path.join(machinePath, 'docker-machine');

    // Return exec based on path
    switch (process.platform) {
      case 'win32': return '"' + machineBin + '.exe"';
      case 'darwin': return machineBin;
      case 'linux': return machineBin;
    }

  };

  // Set of logging functions.
  var log = kbox.core.log.make('MACHINE');

  /*
   * Base shell command.
   */
  var _sh = kbox.core.deps.get('shell');

  /*
   * Run a shell command.
   */
  var sh = function(cmd) {

    // Log start.
    log.debug('Executing command.', cmd);

    // Run shell command.
    return Promise.fromNode(function(cb) {
      _sh.exec(cmd, cb);
    })

    // Log results.
    .tap(function(data) {
      log.debug('Command results.', data);
    });

  };

  /*
   * Check to see if VirtualBox's modules are loaded
   */
  var checkVBModules = function() {

    // Do the checks on linux
    if (process.platform === 'linux') {

      // This is how /etc/init.d/vboxdrv checks if the modules are loaded
      return sh('lsmod | grep -q "vboxdrv[^_-]"')

      // Exit status != 0, modules are not loaded
      .catch(function(/*err*/) {
        // Modules are not loaded
        return Promise.resolve(false);
      })

      .then(function(err) {
        if (_.isEmpty(err)) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      });
    }

    // Otherwise assume we are good
    else {
      return Promise.resolve(true);
    }

  };

  /*
   * Recompile VirtualBox's kernel modules
   *
   * @todo: @jeffesquivels - Try to load VirtualBox's kernel modules and only
   * recompile if that fails
   */
  var bringVBModulesUp = function() {
    var _sh = kbox.core.deps.get('shell');
    var flavor = kbox.install.linuxOsInfo.getFlavor();
    var cmd = meta.PROVIDER_DOWNLOAD_URL.linux.vb[flavor].recompile;

    log.info('VBox\'s kernel modules seem to be down. Attempting recompile...');

    // Run the recompile command
    return Promise.fromNode(function(cb) {
      _sh.execAdmin(cmd, cb);
    })

    // Return good or bad
    .then(function(output) {
      if (_.includes(output, 'wrong')) {
        log.info('The modules couldn\'t be compiled. Dying now.', output);
        return Promise.resolve(false);
      } else {
        log.info('VirtualBox\'s modules seem to be up. Retrying.');
        return Promise.resolve(true);
      }
    });
  };

  // Build module function.
  return {
    checkVBModules: checkVBModules,
    bringVBModulesUp: bringVBModulesUp,
    sh: sh,
    getMachineBinPath: getMachineBinPath,
    getMachineExecutable: getMachineExecutable
  };

};
