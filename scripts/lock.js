'use strict';

/*
 * If `npm install --production` is run then we need to drop a lock file
 * into the root to pin our dependencies
 */

var _ = require('lodash');
var path = require('path');

// If this is a production install then add our lock file
if (_.get(process.env, 'NODE_ENV') === 'production') {

  // Grab some helper modules
  var yaml = require(path.resolve(__dirname, '..', 'lib', 'util', 'yaml.js'));

  // Get the pacakge.json
  var pkg = require(path.resolve(__dirname, '..', 'package.json'));

  // Dump it into the lock file
  var lockFile = path.resolve(__dirname, '..', 'version.lock');
  yaml.toYamlFile({version: pkg.version}, lockFile);

  // Inform user of our situation
  console.log('Detected prouduction install. Dropping in lock.');
}
