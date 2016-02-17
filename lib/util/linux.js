'use strict';

/**
 * Kalabox module for getting deeper linux info
 * @module kbox.util.linux
 */

var fs = require('fs');
var _ = require('lodash');
var assert = require('assert');

var OS_RELEASE_FILEPATH = '/etc/os-release';

var PLATFORM_LINUX = 'linux';

var cache = null;

var isComment = function(str) {
  return _.startsWith(str, '#');
};

var isEmpty = function(str) {
  return (str === null || str === '');
};

var isValueLine = function(str) {
  return (str.indexOf('=') > -1);
};

var parseLine = function(str) {
  var parts = str.split('=');
  assert(parts.length === 2);
  var key = _.trim(parts[0]);
  var val = parts[1].replace(/"/g, '');
  return {
    key: key,
    val: val
  };
};

var getInternal = function() {

  // Check platform.
  if (process.platform !== PLATFORM_LINUX)  {

    // Platform is NOT linux so return nothing.
    return null;

  } else {

    // Read file.
    var data = fs.readFileSync(OS_RELEASE_FILEPATH, {encoding: 'utf8'});

    // Split file into lines and clean up each line.
    var lines = _.map(data.toString().split('\n'), function(line) {
      return _.trim(line);
    });

    // Build string map of values.
    var map = {};
    lines.forEach(function(line) {
      // If not a comment line, not empty, and contains a value.
      if (!isComment(line) && !isEmpty(line) && isValueLine(line)) {
        var result = parseLine(line);
        map[result.key] = result.val;
      }
    });

    return map;

  }

};

var get = exports.get = function() {
  // Memoize
  if (cache) {
    return cache;
  } else {
    cache = getInternal();
    return cache;
  }

};

exports.getFlavor = function() {
  var map = get();
  var isFlavor = function(flavor) {
    return map.ID === flavor || map.ID_LIKE === flavor;
  };

  if (isFlavor('debian')) {
    return 'debian';
  } else if (isFlavor('fedora')) {
    return 'fedora';
  } else {
    var msg = [
      'This version of linux is not currently supported.',
      'We currently only support debian and fedora flavors.',
      'Contact us if you are interested in adding support for your flavor.'
    ];
    throw new Error(msg.join(' '));
  }
};
