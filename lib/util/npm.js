/**
 * Module to loosely coupled npm commands.
 * @module npm
 */

'use strict';

var fs = require('fs');
var npm = require('npm');
var path = require('path');
var S = require('string');
var helpers = require('./helpers.js');
var deps = require('./../core/deps.js');

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
    deps.push(mod + '@' + p.dependencies[mod]);
  }
  return deps;
};

/*
 * Query the npm registry to find out if this module is an npm package.
 */
var isNpmPackage = function(id, callback) {
  npm.load(function(err) {
    if (err) {
      callback(err);
    } else {
      var silent = true;
      npm.commands.view([id], silent, function(err, data) {
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
var nodeOp = function(op, data, callback) {
  var deps = [];
  var args = [];
  var cb = function(err, data) {
    callback(err, data);
  };

  var npmThing = function(op, args) {
    npm.load(
      {loaded: false},
      function(err) {
        if (err) {
          callback(err);
        } else {
          npm.commands[op].apply(this, args);
        }
      }
    );
  };

  if (typeof data === 'string') {
    var packageFile = path.join(data, 'package.json');
    if (fs.existsSync(packageFile)) {
      deps = npmDependencyArray(packageFile);
      args.push(data);
      args.push(deps);
      args.push(cb);
      npmThing(op, args);
    }
    else {
      callback();
    }
  }
  else if (typeof data === 'object') {
    helpers.mapAsync(
      data,
      function(datum, done) {
        isNpmPackage(datum, function(err, npmPackage) {
          if (err) {
            console.log(err);
          } else {
            if (npmPackage !== false) {
              deps.push(npmPackage);
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

exports.installPackages = function(data, callback) {
  nodeOp('install', data, callback);
};

exports.updatePackages = function(data, callback) {
  nodeOp('update', data, callback);
};

exports.updateBackends = function(callback) {
  var backends = [];
  backends.push(deps.lookup('config').engine);
  backends.push(deps.lookup('config').services);
  nodeOp('install', backends, callback);
};
