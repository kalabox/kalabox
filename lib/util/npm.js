/**
 * Module to loosely coupled npm commands.
 * @module npm
 */

'use strict';

var chalk = require('chalk');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var S = require('string');
var helpers = require('./helpers.js');
var deps = require('./../core/deps.js');
var log = require('./../core/log.js');

// Lazy load npm module.
var _npm = null;
var npm = function() {
  if (!_npm) {
    _npm = require('npm');
  }
  return npm;
};

/**
 * Builds an array of dependency strings for npm.commands.install().
 */
var npmDependencyArray = function(packageFilePath) {
  var p = require(packageFilePath);
  if (!p.dependencies) {
    return [];
  }
  var deps = [];
  for (var mod in p.dependencies) {
    // Cannot update NPM while npm is running
    if (mod !== 'npm') {
      deps.push(mod + '@' + p.dependencies[mod]);
    }
  }
  return deps;
};

/*
 * Query the npm registry to find out if this module is an npm package.
 */
var isNpmPackage = function(id, callback) {
  npm().load(function(err) {
    if (err) {
      callback(err);
    } else {
      var silent = true;
      npm().commands.view([id], silent, function(err, data) {
        if (err) {
          if (S(err.message).startsWith('404 Not Found: ' + id)) {
            callback(null, false);
          } else {
            callback(err);
          }
        } else {
          // @todo: perhaps do some validation of the returned json data.
          callback(null, id);
        }
      });
    }
  });
};

/**
 * Installs nodejs dependencies for the given profile path.
 */
var nodeOp = function(op, where, pkgs, callback) {

  if (typeof callback === 'undefined') {
    callback = pkgs;
    if (typeof where === 'string') {
      pkgs = false;
    }
    else {
      pkgs = where;
      where = false;
    }
  }

  var deps = [];
  var args = [];

  var cb = function(err, data) {
    callback(err, data);
  };

  var npmThing = function(op, args) {
    npm().load(
      {loaded: false},
      function(err) {
        if (err) {
          callback(err);
        } else {
          npm().commands[op].apply(this, args);
        }
      }
    );
  };

  if (pkgs === false && where !== false) {
    var packageFile = path.join(where, 'package.json');
    if (fs.existsSync(packageFile)) {
      deps = npmDependencyArray(packageFile);
      if (op === 'install') {
        args.push(where);
      }
      args.push(deps);
      args.push(cb);
      npmThing(op, args);
    }
    else {
      callback();
    }
  }
  else if (pkgs !== false) {
    if (op === 'install' && where !== false) {
      args.push(where);
    }
    helpers.mapAsync(
      pkgs,
      function(pkg, done) {
        isNpmPackage(pkg, function(err, npmPackage) {
          if (err) {
            console.log(err);
          } else {
            if (npmPackage !== false) {
              deps.push(npmPackage);
              done(null);
            }
            else {
              done(null);
            }
          }
        });
      },
      function(errs) {
        if (errs) {
          callback(errs);
        }
        else {
          args.push(deps);
          args.push(cb);
          npmThing(op, args);
        }
      }
    );
  }
  else {
    callback();
  }
};

exports.installPackages = function(where, pkgs, callback) {
  nodeOp('install', where, pkgs, callback);
};

exports.updateBackends = function(callback) {
  var installBackends = [];
  var src = deps.lookup('config').srcRoot;
  var backends = [
    deps.lookup('config').engine,
    deps.lookup('config').services
  ];
  _.each(backends, function(backend) {
    var backParts = backend.split('@');
    var backendName = backParts[0];
    if (fs.existsSync(path.join(src, 'node_modules', backendName, '.git'))) {
      log.info(chalk.yellow(
        'It looks like you installed ' + backendName + ' with git. Update by ' +
        'running a git pull on master in there.'));
    }
    else {
      installBackends.push(backend);
    }
  });
  if (installBackends.length > 0) {
    nodeOp('install', src, installBackends, callback);
  }
  else {
    callback();
  }
};

exports.updateKalabox = function(callback) {
  var src = deps.lookup('config').srcRoot;
  nodeOp('install', src, callback);
};
