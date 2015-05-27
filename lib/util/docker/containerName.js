'use strict';

var _ = require('lodash');
var Regex = require('regex');
var util = require('util');
var pp = util.inspect;

// Constants.
var SEPARATOR = '_';
var SERVICE_KIND = 'service';
var SERVICE_PREFIX = 'kalabox';
var APP_KIND = 'app';
var APP_PREFIX = 'kb';

/*
 * Regex for validating atoms, compiled once upon first use.
 */
var regex = _.once(function() {

  var regexString = '^[a-z]+[-a-z0-9]*$';

  return new Regex(regexString);

});

/*
 * Validate an atom.
 */
var isValidAtom = function(atom) {

  // Test atom against regex.
  return regex().test(atom);

};

/*
 * Valid property names of a container name object.
 */
var validKeys = [
 'kind',
 'app',
 'name'
];

/*
 * Validate container name object.
 */
var invariant = function(o) {

  _.each(o, function(val, key) {

    if (!isValidAtom(val)) {
      throw new Error(
        util.format(
          'Invalid name part %s of container name object %s.', val, pp(o)
        )
      );
    }

    if (!_.contains(validKeys, key)) {
      // Throw error if you find an invalid object property.
      throw new Error(
        util.format(
          'Invalid property %s of container name object %s.', key, pp(o)
        )
      );
    }

  });

};

/*
 * Create a app container name.
 */
var create = function(appName, name) {

  // Build object.
  var o = {
    kind: APP_KIND,
    app: appName,
    name: name
  };

  // Validate.
  invariant(o);

  return o;

};

/*
 * Create a service container name.
 */
var createService = function(name) {

  // Build object.
  var o = {
    kind: SERVICE_KIND,
    name: name
  };

  // Validate.
  invariant(o);

  return o;

};

/*
 * Parse a string to a container name object.
 */
var parse = function(s) {

  // Remove any extra fluff.
  if (_.head(s) === '/' || _.head(s) === ' ') {
    s = s.slice(1);
  }

  // Split string.
  var parts = s.split(SEPARATOR);

  if (parts.length === 2 && parts[0] === SERVICE_PREFIX) {

    // This is a service container.
    return createService(parts[1]);

  } else if (parts.length === 3 && parts[0] === APP_PREFIX) {

    // This is a user container.
    return create(parts[1], parts[2]);

  } else {

    // Throw an error.
    throw new Error('Invalid container name: ' + s);

  }

};

/*
 * Take container name object and format to a string.
 */
var format = function(o) {

  // Validate.
  invariant(o);

  // Convert to a string.
  return _.values(o).join(SEPARATOR);

};

module.exports = {
  create: create,
  createService: createService,
  format: format,
  parse: parse
};
