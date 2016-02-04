'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  // Node modules
  var path = require('path');

  // NPM modules
  var _ = require('lodash');
  var fs = require('fs-extra');

  // Kalabox modules
  var install = kbox.install;

  // Get and load the install config
  var config = kbox.util.yaml.toJson(path.join(__dirname, 'config.yml'));

  /*
   * Return a list of all the names of apps kbox knows about.
   */
  var getAppNames = function() {

    // Get list of apps kbox knows about.
    return kbox.app.list()
    // Map apps to a list of app names and sort.
    .then(function(apps) {
      var appNames = _.map(apps, function(app) {
        return app.name;
      });
      appNames.sort();
      return appNames;
    });

  };

  /*
   * Return a list of containers for a given app name.
   */
  var getAppContainers = function(appName) {

    // Get list of containers for this app name.
    return kbox.engine.list(appName)
    // Map containers to container ids.
    .map(function(container) {
      return container.id;
    })
    // Map container ids to container infos.
    .map(function(containerId) {
      return kbox.engine.inspect({cid: containerId});
    });

  };

  /*
   * Return an app stats object.
   */
  var getAppStats = function(appName) {

    // Starting object.
    var obj = {
      running: 0,
      total: 0
    };

    // Get app containers.
    return getAppContainers(appName)
    // Reduce list of containers to a app stats object.
    .reduce(function(obj, containerInfo) {
      // Increment running.
      if (containerInfo.running) {
        obj.running += 1;
      }
      // Increment total.
      obj.total += 1;
      return obj;
    }, obj);

  };

  /*
   * Output a list of all our containers
   * if in an app we print out more data and only the apps containers
   * if we are not in an app we print out a summary of all containers
   */
  var outputContainers = function(app, done) {

    // Rejig the sig
    if (typeof app === 'function' && !done) {
      done = app;
      app = null;
    }

    // Set an app name if appropriate
    var appName = null;
    if (app) {
      appName = app.name;
    }

    // Get a list of all our things
    return kbox.engine.list(appName)

    // Iterate through each container
    .each(function(container) {

      // Get more info about each container
      return kbox.engine.inspect({cid: container.id})

      // Take the info and print it out nicely
      .then(function(info) {
        if (info) {
          console.log(JSON.stringify(info, null, '  '));
        }
      });

    })

    // You complete me
    .nodeify(done);

  };

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
      return ['setx', 'PATH', '"%PATH%;' + sysBinRoot + '"', '/M'].join(' ');
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
    getAppStats: getAppStats,
    getAppContainers: getAppContainers,
    getAppNames: getAppNames,
    kboxBin2Path: kboxBin2Path,
    outputContainers: outputContainers,
    needsKboxBinary: needsKboxBinary,
    installKboxBinary: installKboxBinary
  };

};
