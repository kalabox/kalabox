'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  // Node modules
  var path = require('path');

  // NPM modules
  var fs = require('fs-extra');

  // Kalabox modules
  var install = kbox.install;

  // Get and load the install config
  var config = kbox.util.yaml.toJson(path.join(__dirname, 'config.yml'));

  /*
   * Helper function to assess whether we need a new B2D
   */
  var needsKboxBinary = function() {
    return install.getProUp('KBOX_BIN_VERSION', config.kalabox.version);
  };

  /*
   * Helper function to assess whether we need a new B2D
   */
  var kboxBin2Path = function() {

    // Get the sysbin root
    var sysBinRoot = path.join(kbox.core.deps.get('config').sysConfRoot, 'bin');

    // Return on windows
    if (process.platform === 'win32') {
      return ['setx', 'Path', '%Path%;' + sysBinRoot].join(' ');
    }

    // Return on posix
    // @todo: we might need to verify /usr/local/bin/ exists
    else {

      // Source and target file
      var kboxBin = (process.platform === 'win32') ? 'kbox.exe' : 'kbox';
      var source = path.join(sysBinRoot, kboxBin);
      var target = path.join('/usr/local/bin', kboxBin);
      return ['ln', '-sf', source, target].join(' ');
    }
  };

  /*
   * Helper function to install the syncthing binary
   */
  var installKboxBinary = function(state) {

    // Source path
    var downloadDir = kbox.util.disk.getTempDir();
    var srcFile = path.basename(config.kalabox.pkg[process.platform]);

    // Destination path
    var sysConfRoot = kbox.core.deps.get('config').sysConfRoot;
    var kboxBinDest = path.join(sysConfRoot, 'bin');
    var destFile = 'kbox';
    var destExt = (process.platform === 'win32') ? '.exe' : '';

    // Move the kbox bin over to the kbox bin location
    var source = path.join(downloadDir, path.basename(srcFile));
    var dest = path.join(kboxBinDest, destFile + destExt);
    state.log.debug('INSTALLING ' + source + ' FROM => ' + downloadDir);
    fs.copySync(source, dest, {clobber: true});
    state.log.debug('INSTALLED ' + dest + ' TO => ' + kboxBinDest);

    // Make executable
    fs.chmodSync(dest, '0755');

  };

  return {
    kboxBin2Path: kboxBin2Path,
    needsKboxBinary: needsKboxBinary,
    installKboxBinary: installKboxBinary
  };

};
