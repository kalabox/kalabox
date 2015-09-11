/**
 * Module to loosely coupled npm commands.
 * @module kbox.util.npm
 */

'use strict';

/*
 * Intrinsic modules.
 */
var path = require('path');
var url = require('url');

/*
 * NPM modules.
 */
var _ = require('lodash');
var chalk = require('chalk');
var VError = require('verror');

/*
 * Kbox modules.
 */
var deps = require('./../core/deps.js');
var config = require('./../core/config.js');
var log = require('./../core/log.js');
var Promise = require('../promise.js');

/*
 * Promisified modules.
 */
var fs = Promise.promisifyAll(require('fs'));

// Lazy load npm module.
var npmInstance = _.once(function() {
  return require('npm');
});

/**
 * Builds an array of dependency strings for npm.commands.install().
 */
var loadNpmDependencies = function(packageFilePath) {

  // Try to load the package file.
  return Promise.try(function() {
    return require(packageFilePath);
  })
  // Wrap the error to give more info to user.
  .catch(function(err) {
    throw new VError(err, 'Failed to load package file -> %s', packageFilePath);
  })
  // Map modules to name@version.
  .then(function(p) {
    if (!p.dependencies) {
      return [];
    } else {
      var deps = [];
      _.each(p.dependencies, function(version, name) {
        // NPM module must be filtered out because you can not update
        // npm while it's running.
        if (name !== 'npm') {
          deps.push([name, version].join('@'));
        }
      });
      return deps;
    }
  });

};

/*
 * Query the npm registry to find out if this module is an npm package.
 */
var isNpmPackage = function(id) {

  // @todo: @bcauldwell - This needs to be centralized.
  id = _.head(id.split('@'));

  // Init NPM.
  return Promise.fromNode(npmInstance().load)
  // Silently query for info on package.
  .then(function() {
    var silent = true;
    return Promise.fromNode(function(cb) {
      return npmInstance().commands.view([id], silent, cb);
    });
  })
  // Error occurred so this probably is not a NPM package.
  .catch(function(err) {
    if (_.contains(err.message, '404 Not Found: ' + id)) {
      // Not a NPM package.
      return false;
    } else {
      // Wrap unexpected error.
      throw new VError(err,
        'Failure while checking if %s is an NPM module.',
        id
      );
    }
  })
  // Data was return so this is in fact a NPM package.
  .then(function(data) {
    return true;
  });

};

/**
 * Installs nodejs dependencies for the given profile path.
 */
var npmInstall = function(workingDir, packages) {

  // Tell node it's init is not loaded?
  var opts = {loaded:false};

  // Filter packages to only include NPM packages.
  return Promise.filter(packages, isNpmPackage)
  // Init NPM.
  .tap(function() {
    return Promise.fromNode(function(cb) {
      npmInstance().load(opts, cb);
    });
  })
  // Execute npm task.
  .then(function(filteredPackages) {
    // Build args and run npm install task.
    return Promise.fromNode(function(cb) {
      npmInstance().commands.install(workingDir, filteredPackages, cb);
    })
    // Wrap errors.
    .catch(function(err) {
      throw new VError(err, 'Error while running NPM install %s',
        filteredPackages);
    });
  })
  // Make sure task doesn't run forever.
  // @todo: @pirog - Is this timeout ok?
  .timeout(5 * 60 * 1000)
  // Wrap errors.
  .catch(function(err) {
    throw new VError(err, 'Error during NPM install.');
  });

};

/**
 * Returns a string with the url of the master branch
 * tarball. The package must be on NPM and have a repository
 * field in its pacakge.json. It must also have a master branch that is
 * considered the development branch on github.
 * @arg {string} pkg - the package to be processed
 * @example
 * var parts = pkg.split('@');
 * return npm.getMasterTarball(parts[0])
 *
 * .then(function(info) {
 *   console.log(info);
 * });
 */
var getMasterTarball = exports.getMasterTarball = function(pkg) {

  // Init NPM.
  return Promise.fromNode(npmInstance().load)

  // Silently query for info on package.
  .then(function() {
    var silent = true;
    return Promise.fromNode(function(cb) {
      return npmInstance().commands.view([pkg], silent, cb);
    });
  })

  // Return the tarball location
  .then(function(info) {

    // Grab the first key and parse the URL
    var key = Object.keys(info)[0];
    var repoUrl = url.parse(info[key].repository.url);

    // Build our tarball URL
    // https://github.com/kalabox/kalabox-plugin-dbenv/tarball/master
    var tarUrl = {
      protocol: 'https:',
      host: repoUrl.host,
      pathname: path.join(_.head(repoUrl.path.split('.')), 'tarball', 'master')
    };

    // Return the formatted tar URL
    return url.format(tarUrl);
  });

};

/**
 * Installs NPM packages. You need to either to specify where the package.json
 * exists or an array of packages and where to install them.
 * @arg {string} where [optional] - The location of a package.json
 * @arg {array} pkgs [optional] - An array of node packages
 * @arg {function} callback - the callback
 * @example
 * kbox.util.npm.installPackages(appRoot, function(err) {
 *   if (err) {
 *     done(err);
 *   }
 *   else {
 *     state.log.debug('Updated app deps!');
 *     done();
 *   }
 * });
 */
exports.installPackages = function(workingDir, packagesIn, callback) {

  if (!callback && typeof packagesIn === 'function') {
    callback = packagesIn;
    packagesIn = null;
  }

  // Check if we need to load dependencies from a package.json.
  return Promise.try(function() {
    if (packagesIn) {
      return packagesIn;
    } else {
      // Load dependencies from working directorie's package.json.
      var packageFilepath = path.join(workingDir, 'package.json');
      if (fs.existsSync(packageFilepath)) {
        // If package file exists then load it.
        return loadNpmDependencies(packageFilepath);
      } else {
        // Package file does not exist, return an empty array.
        return [];
      }
    }
  })
  // Do a NPM install.
  .then(function(packages) {

    // Load config.
    // Need to grab it this way because our postinstall script runs without
    // kbox being initialized.
    var globalConfig = config.getGlobalConfig();

    // If we are in devMode we want to check for kalabox-plugins and make sure
    // we grab the dev versions of each
    if (globalConfig.devMode === true) {

      /*
       * Replaces the version part of a npm pkg@version string with
       * the master branch tarball from github if that package is a kalabox
       * plugin
       *
       * If you are using your own external app or plugin it needs to live on github
       * and have a master branch or this is not going to work.
       *
       */
      var pkgToDev = function(pkg) {

        // Split our package so we can reassemble later
        var parts = pkg.split('@');

        // Grab the dev tarball if ths is a kalabox plugin
        if (_.includes(pkg, 'kalabox-')) {

          // Get the tarball location
          return getMasterTarball(parts[0])

          // Reassamble and return
          .then(function(tarPath) {
            return [parts[0], tarPath].join('@');
          });
        }
        // Otherwise just return what we have
        else {
          return pkg;
        }

      };

      // Rebuild our packages with dev versions if needed
      packages = _.map(packages, pkgToDev);
    }

    if (packages.length > 0) {
      // Only install if there are packages to install.
      return npmInstall(workingDir, packages);
    }
  })
  // Return.
  .nodeify(callback);

};

/*
 * Update a set of packages.
 */
var updatePackages = function(packagesIn, callback) {

  // Load config.
  var config = deps.lookup('config');

  // Get working directory.
  var workingDir = config.srcRoot;

  // Filter list of packages.
  return Promise.filter(packagesIn, function(pkg) {

    // Get the package ID, the package without the version info.
    var pkgId = _.head(pkg.split('@'));

    // If there was a git repo, this is where it would be.
    var gitRepoPath = path.join(workingDir, 'node_modules', pkgId, '.git');

    // Is this package a cloned git repo instead of an installed pacakge.
    // @todo: @bcauldwell - This would run a little faster if we used
    // the async version of fs.exists.
    var isGitRepo = fs.existsSync(gitRepoPath);

    // Let the user know they need to manually update this package.
    if (isGitRepo) {
      log.info(chalk.yellow(
        'It looks like you installed ' + pkgId + ' with git.' +
        ' Update by running a git pull on master in there.'
      ));
    }

    // Filter out git repos.
    return !isGitRepo;

  })
  // Do a NPM install.
  .then(function(packages) {
    return npmInstall(workingDir, packages);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Updates the service and engine backends.
 * @arg {function} callback - the callback
 * @example
 * kbox.util.npm.updateBackends(function(err) {
 *   if (err) {
 *     done(err);
 *   }
 *   else {
 *     state.log.debug('Updated kalabox backends!');
 *     kbox.util.npm.updateApps(function(err) {
 *       if (err) {
 *         done(err);
 *       }
 *       else {
 *         state.log.debug('Updated kalabox apps!');
 *         done();
 *       }
 *     });
 *   }
 * });
 */
exports.updateBackends = function(callback) {

  // Get config.
  var config = deps.lookup('config');

  // Update packages.
  return updatePackages([config.engine, config.services])
  // Return.
  .nodeify(callback);

};

/**
 * Updates the app plugin backends.
 * @arg {function} callback - the callback
 * @example
 * kbox.util.npm.updateApps(function(err) {
 *   if (err) {
 *     done(err);
 *   }
 *   else {
 *     state.log.debug('Updated kalabox apps!');
 *     done();
 *   }
 * });
 */
exports.updateApps = function(callback) {

  // Get config.
  var config = deps.lookup('config');

  // Update packages.
  return updatePackages(config.apps)
  // Return.
  .nodeify(callback);

};
