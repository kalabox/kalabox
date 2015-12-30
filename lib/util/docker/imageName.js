'use strict';

var USER_SEP = '/';
var TAG_SEP = ':';
var VALID_KEYS = ['user', 'repo', 'tag'];

var _ = require('lodash');
var core = require('../../core.js');
var util = require('util');
var pp = util.inspect;

/*
 * Parse a docker image name to an object.. "user/repo:tag"
 */
var parse = function(s) {

  // Validate input is a string.
  if (typeof s !== 'string') {
    throw new Error('Invalid image name: ' + s);
  }

  // Split by user separator.
  var parts = s.split(USER_SEP);

  // Init object.
  var o = {
    user: undefined,
    repo: undefined,
    tag: undefined
  };

  if (parts.length === 1) {

    // Just repo, no user.
    o.repo = parts[0];

  } else if (parts.length === 2) {

    // User and repo.
    o.user = parts[0];
    o.repo = parts[1];

  } else {

    // This should never happen so throw an error.
    throw new Error('Invalid image name: ' + s);

  }

  // Split repo by tag separator.
  parts = o.repo.split(TAG_SEP);

  if (parts.length === 2) {

    // Repo and tag.
    o.repo = parts[0];
    o.tag = parts[1];

  } else if (parts.length > 2) {

    // This should never happen so throw an error.
    throw new Error('Invalid image name: ' + s);

  }

  // Return.
  return o;

};

/*
 * Take a docker image object and format it as a string.
 */
var format = function(o) {

  // Validate object.
  if (!o || typeof o !== 'object') {
    throw new Error('Invalid image object: ' + o);
  }

  // Validate object has only valid properties.
  _.each(o, function(val, key) {
    if (!_.contains(VALID_KEYS, key)) {
      throw new Error(util.format(
        'Invalid property "%s" in image object: %s',
        key,
        pp(o)
      ));
    }
    if (val && typeof val !== 'string') {
      throw new Error(util.format(
        'Invalid property value "%s" in image object: %s',
        val,
        pp(o)
      ));
    }
  });

  // Validate we at least have a repo;
  if (!o.repo) {
    throw new Error('Invalid image repo: ' + o);
  }

  // Start out as repo.
  var s = o.repo;

  if (o.user) {
    // Prepend user.
    s = [o.user, s].join(USER_SEP);
  }

  if (o.tag) {
    // Append tag.
    s = [s, o.tag].join(TAG_SEP);
  }

  // Return.
  return s;

};

/*
 * Ensure image name has a user and a version tag.
 */
var expand = function(imageName) {

  // Parse string to object.
  var o = parse(imageName);

  // Get docker registry and devMode user from global config.
  var globalConfig = core.deps.get('globalConfig');
  var dockerRegistryUser = globalConfig.engineRepo;

  // Make sure user is set.
  if (!o.user) {
    if (!dockerRegistryUser) {
      throw new Error('Invalid globalConfig.engineRepo: ' +
        pp(dockerRegistryUser));
    }
    o.user = dockerRegistryUser;
  }

  // Make sure tag is set.
  if (!o.tag && o.user === dockerRegistryUser) {
    o.tag = globalConfig.imgVersion;
  }

  // Format object to string.
  return format(o);

};

module.exports = {
  expand: expand,
  format: format,
  parse: parse
};
