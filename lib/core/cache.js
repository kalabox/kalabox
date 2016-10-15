/**
 * Main cache module
 *
 * @name cache
 */

'use strict';

// Globally needed modules
var _ = require('lodash');
var format = require('util').format;
var fs = require('fs-extra');
var jsonfile = require('jsonfile');
var path = require('path');

// Debug info logging function.
var log = require('./log.js').make('CACHE');
var env = require('./config.js').getEnvConfig();

/*
 * Construct our cache singleton
 */
var cache = {
  basePath: path.join(env.userConfRoot, 'cache'),
  mem: {},
  registry: path.join(env.userConfRoot, 'cache', 'registry.json')
};

// Ensure that cache directory exists
fs.mkdirpSync(cache.basePath);

/*
 * Get a cache file
 */
var getFile = function(path) {
  try {
    return jsonfile.readFileSync(path);
  }
  catch (e) {
    return {};
  }
};

/*
 * Set the cache registry
 */
var setFile = function(path, data) {
  jsonfile.writeFileSync(path, data);
};

/*
 * Add entry to registry
 */
var addRegistry = function(key, expires) {
  var registry = getFile(cache.registry);
  registry[key] = expires;
  setFile(cache.registry, registry);
  log.info(format('Cache object %s set to expire at %s.', key, expires));
};

/*
 * Remove entry to registry
 */
var removeRegistry = function(key) {
  var registry = getFile(cache.registry);
  delete registry[key];
  setFile(cache.registry, registry);
};

/*
 * Removes data from the cache
 */
var remove = function(key) {
  delete cache.mem[key];
  try {
    fs.unlinkSync(path.join(cache.basePath, key));
  }
  catch (e) {}
  removeRegistry(key);
  log.info(format('Removing cache entry %s', key));
};

/*
 * Return data from the cache if it exists
 */
exports.get = function(key) {

  // Check to see if our entry has expired or not
  if (getFile(cache.registry)[key] < Date.now() || !env.cache) {
    log.info(format('Cache object %s expired. Recaching...', key));
    remove(key);
  }

  // Pull from the cache
  if (!_.isEmpty(cache.mem[key])) {
    log.info(format('Found data in memcache index %s', key));
    return cache.mem[key];
  }
  else if (!_.isEmpty(getFile(path.join(cache.basePath, key)))) {
    log.info(format('Found data in filecache index %s', key));
    return getFile(path.join(cache.basePath, key));
  }
  else {
    log.info(format('No cached data found at index %s', key));
  }

};

/*
 * Add data to the cache
 */
exports.set = function(key, data) {
  cache.mem[key] = data;
  setFile(path.join(cache.basePath, key), data);
  addRegistry(key, Date.now() + 86400);
  log.info(format('Setting data in memcache and filecache at index %s', key));
};
