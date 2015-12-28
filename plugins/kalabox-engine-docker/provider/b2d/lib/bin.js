/**
 * Contains binary handling suff
 * @module b2d.bin
 */

'use strict';

module.exports = function(kbox) {

  // Node modules
  var format = require('util').format;
  var path = require('path');

  // NPM modules
  var VError = require('verror');
  var _ = require('lodash');

  // Kalabox modules
  var Promise = kbox.Promise;
  var meta = require('./../meta.js');

  /*
   * Get directory for provider executable.
   */
  var getB2DBinPath = function() {

    // Get sysconf
    var sysConfRoot = kbox.core.deps.get('config').sysConfRoot;

    // Return path based on platform
    switch (process.platform) {
      case 'win32': return 'C:\\Program Files\\Boot2Docker for Windows';
      case 'darwin': return '/' + path.join('usr', 'local', 'bin');
      case 'linux': return path.join(sysConfRoot, 'bin');
    }

  };

  /*
   * Return the B2D executable location
   */
  var getB2DExecutable = function() {

    // Get b2d path
    var b2dPath = getB2DBinPath();

    // Return exec based on path
    switch (process.platform) {
      case 'win32': return '"' + path.join(b2dPath, 'boot2docker.exe') + '"';
      case 'darwin': return path.join(b2dPath, 'boot2docker');
      case 'linux': return path.join(b2dPath, 'boot2docker');
    }

  };

  /*
   * Return the SSH executable location
   */
  var getSSHExecutable = function() {

    // For cleanliness
    var wBin = '"C:\\Program Files (x86)\\Git\\bin\\ssh.exe"';

    return process.platform === 'win32' ? wBin : 'ssh';

  };

  // Set of logging functions.
  var log = kbox.core.log.make('BOOT2DOCKER');

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
    })
    // Wrap errors.
    .catch(function(err) {
      log.debug(format('Error running command "%s".', cmd), err);
      throw new VError(err, 'Error running command "%s".', cmd);
    });

  };

  /*
   * Check to see if VirtualBox's modules are loaded
   */
  var checkVBModules = function() {
    if (kbox.install.linuxOsInfo.getFlavor() === 'debian') {

      // This is how /etc/init.d/vboxdrv checks if the modules are loaded
      return sh('lsmod | grep -q "vboxdrv[^_-]"')

      // Exit status != 0, modules are not loaded
      .catch(function(/*err*/) {
        // Modules are not loaded
        return Promise.resolve(false);
      })

      .then(function(modulesUp) {
        if (modulesUp) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      });
    } else {
      Promise.resolve(true);
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

    return Promise.fromNode(function(cb) {
      _sh.execAdmin(cmd, cb);
    })

    // The modules failed to recompile
    // Actually, vboxdrv script exits with code = 0 even on failure,
    // so this catch probably won't be ever executed
    // Leaving this here just 'cause it can't hurt
    .catch(function(err) {
      log.info('The modules couldn\'t be compiled. Dying now.', err);
      return Promise.resolve(false);
    })

    .then(function(output) {
      if (_.includes(output, 'wrong')) {
        // Recompilation failed
        log.info('The modules couldn\'t be compiled. Dying now.', output);
        return Promise.resolve(false);
      } else {
        return Promise.resolve(true);
      }
    });
  };

  // Build module function.
  return {
    checkVBModules: checkVBModules,
    bringVBModulesUp: bringVBModulesUp,
    sh: sh,
    getB2DBinPath: getB2DBinPath,
    getB2DExecutable: getB2DExecutable,
    getSSHExecutable: getSSHExecutable
  };

};
