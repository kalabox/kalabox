'use strict';

var _ = require('lodash');
var kbox = require('../kbox.js');
var pp = require('util').inspect;

/*
 * Returns current version of kalabox.
 */
var get = function() {

  var globalConfig = kbox.core.deps.get('globalConfig');
  return globalConfig.version;

};

/*
 * Parse a version string into a version object.
 */
var parse = function(s) {

  // Validate version string is in fact a string.
  if (typeof s !== 'string') {
    throw new Error('Invalid version string: ' + pp(s));
  }

  // Split string into parts.
  var parts = s.split('.');

  // Validate.
  if (parts.length !== 3) {
    throw new Error('Invalid config.version: ' + s);
  }

  // Return as an object.
  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2]
  };

};

/*
 * List of valid property keys for a version object.
 */
var validPropertyKeys = _.once(function() {

  return _.keys(parse('0.0.0'));

});

/*
 * Format a version object into a string.
 */
var format = function(o) {

  // Validate object is an object.
  if (typeof o !== 'object') {
    throw new Error('Invalid version object: ' + pp(o));
  }

  // Validate object properties.
  _.each(o, function(val, key) {
    if (typeof val !== 'string' || !_.contains(validPropertyKeys(), key)) {
      throw new Error('Invalid version object: ' + pp(o));
    }
  });

  // Return as a string.
  return [o.major, o.minor, o.patch].join('.');

};

/*
 * Take a version and set it's patch to zero.
 */
var truncatePatch = function(version) {

  var o = parse(version);
  o.patch = '0';
  return format(o);

};

module.exports = {
  format: format,
  get: get,
  parse: parse,
  truncatePatch: truncatePatch
};
