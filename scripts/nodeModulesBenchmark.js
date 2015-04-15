'use strict';

var _ = require('lodash');
var async = require('async');
var ben = require('ben');
var fs = require('fs');
var path = require('path');

// Use this clear the require cache.
var clearCache = function() {
  console.log('Clearing cache...');
  for (var key in require.cache) {
    console.log('  Deleting from cache -> ' + key);
    delete require.cache[key];
  }
};

// Get node modules directory.
var nodeModulesDir = path.join(__dirname, 'node_modules');

// Loop through each
fs.readdir(nodeModulesDir, function(err, dirs) {

  // Check for error.
  if (err) {
    throw err;
  }

  // Validate number of node modules directories.
  if (dirs.length < 20) {
    throw new Error('Unexpected number of installed node modules: ' +
      dirs.length);
  }

  // Filter out hidden dirs.
  dirs = _.filter(dirs, function(dir) {
    return !_.startsWith(dir, '.') &&
      !_.startsWith(dir, 'jsdoc') &&
      !_.startsWith(dir, 'grunt');
  });

  // Array for storing results.
  var results = [];

  // Loop through each node module directory.
  _.each(dirs, function(dir) {

    // Make sure you clear the cache.
    clearCache();

    var ms = ben(1, function() {
      var x = require(dir);
    });

    results.push({
      id: dir,
      ms: ms
    });

  });

  // Compare function.
  var compare = function(x, y) {
    if (x.ms < y.ms) {
      return 1;
    } else if (x.ms > y.ms) {
      return -1;
    } else {
      return 0;
    }
  };

  // Sort results by ms.
  results.sort(compare);
  results.reverse();

  // Display results.
  console.log(results);

});
