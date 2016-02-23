
'use strict';

module.exports = function(kbox) {

  // Node modules
  var path = require('path');

  // NPM modules
  var _ = require('lodash');
  var VError = require('verror');

  // Grab client module
  var Client = require('./lib/client.js');
  var pantheon = new Client(kbox);

  // Load our events and create modules
  require('./lib/create.js')(kbox, pantheon);
  require('./lib/events.js')(kbox, pantheon);

  /*
   * App package location.
   * NOTE: if in dev mode and not in a binary this should be internal. Internal
   * locations are relative to the node_modules folder
   * All
   * other modes should be an URL to an archive and then the path location of the app
   * relative to the archive root
   */
  var packageData = function() {

    // Kbox mods
    var util = kbox.util;

    // Get relevant config options
    var config = util.yaml.toJson(path.join(__dirname, 'lib', 'config.yml'));
    var isBinary = kbox.core.deps.get('globalConfig').isBinary;
    var locked = kbox.core.deps.get('globalConfig').locked;

    // Return an internal path
    if (!isBinary && !locked) {
      var srcRoot = kbox.core.deps.get('globalConfig').srcRoot;
      var modFold = path.join(srcRoot, 'node_modules');
      return {
        path: path.join(modFold, config.path.base, config.path.path)
      };
    }
    // Return a url of an archive
    else {
      var format = (process.platform === 'win32') ? 'zipball' : 'tarball';
      var branch = (!locked) ? config.url.dev : config.url.prod;
      var url = [config.url.base, format, branch].join('/');
      return {
        url: url,
        path: config.url.path,
        folder: config.url.folder
      };
    }

  };

  // Declare our app to the world
  kbox.create.add('pantheon', {
    task: {
      name: 'Pantheon',
      description: 'Creates a Pantheon app.',
      pkg: packageData()
    }
  });

  // Task to create kalabox apps
  kbox.tasks.add(function(task) {
    kbox.create.buildTask(task, 'pantheon');
  });

  // Create integration.
  kbox.integrations.create('pantheon', function(api) {

    // Authorize login.
    api.methods.auth = function(username, password) {
      pantheon.reset();
      return pantheon.auth(username, password)
      .wrap('Error authorizing: %s', username);
    };

    // Set the logins method of api.
    api.methods.logins = function() {
      return kbox.Promise.try(function() {
        pantheon.reset();
        return pantheon.getSessionFiles();
      })
      .wrap('Error getting logins.');
    };

    // Set the sites method of the api.
    api.methods.sites = function(username) {
      // Get email.
      // Set session based on email.
      return kbox.Promise.try(function() {
        pantheon.reset();
        var session = pantheon.getSessionFile(username);
        pantheon.setSession(username, session);
      })
      // Get and map sites.
      .then(function() {
        return pantheon.getSites()
        .then(function(sites) {
          return _.transform(sites, function(acc, val, key) {
            acc.push({
              name: val.information.name,
              id: key,
              // Instead of loading environments now, instead create a function
              // that can be called to get them when needed.
              getEnvironments: function() {
                // Reset cache.
                pantheon.reset();
                var session = pantheon.getSessionFile(username);
                pantheon.setSession(username, session);
                // Get environments.
                return pantheon.getEnvironments(key)
                // Wrap errors.
                .catch(function(err) {
                  throw new VError(err, 'Error getting environments.');
                })
                // Map, filter, and sort environments.
                .then(function(envs) {
                  delete envs.live;
                  delete envs.test;
                  envs = _.map(envs, function(val, key) {
                    return key;
                  });
                  envs.sort();
                  return envs;
                });
              }
            });
            return acc;
          }, []);
        });
      })
      .wrap('Error getting sites.');
    };

  });

};
