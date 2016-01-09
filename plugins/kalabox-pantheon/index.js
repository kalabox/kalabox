
'use strict';

module.exports = function(kbox) {

  // Node modules
  var path = require('path');

  // NPM modules
  var _ = require('lodash');

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
    var devMode = kbox.core.deps.get('globalConfig').devMode;

    // Return an internal path
    if (!isBinary && devMode) {
      var srcRoot = kbox.core.deps.get('globalConfig').srcRoot;
      var modFold = path.join(srcRoot, 'node_modules');
      return {
        path: path.join(modFold, config.path.base, config.path.path)
      };
    }
    // Return a url of an archive
    else {
      var format = (process.platform === 'win32') ? 'zipball' : 'tarball';
      var branch = (devMode) ? config.url.dev : config.url.prod;
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
    api.methods.auth = function(/*email, password*/) {
      var self = this;
      return kbox.Promise.try(function() {
        return self.ask([
          {
            id: 'username'
          },
          {
            id: 'password'
          }
        ]);
      })
      .then(function(answers) {
        return pantheon.auth(answers.username, answers.password);
      })
      .tap(function(session) {
        return pantheon.setSession(session);
      });
    };

    // Set the logins method of api.
    api.methods.logins = function() {
      return kbox.Promise.try(function() {
        return pantheon.getSessionFiles();
      });
    };

    // Set the sites method of the api.
    api.methods.sites = function() {
      var self = this;
      // Get email.
      return kbox.Promise.try(function() {
        return self.ask([
          {
            id: 'username'
          }
        ]);
      })
      // Set session based on email.
      .then(function(answers) {
        var session = pantheon.getSessionFile(answers.username);
        pantheon.setSession(session);
      })
      // Get and map sites.
      .then(function() {
        return pantheon.getSites()
        .then(function(sites) {
          var sitesArray = _.transform(sites, function(acc, val, key) {
            acc.push({
              name: val.information.name,
              id: key
            });
            return acc;
          }, []);
          return kbox.Promise.map(sitesArray, function(site) {
            return pantheon.getEnvironments(site.id)
            .then(function(envs) {
              delete envs.live;
              delete envs.test;
              site.environments = _.map(envs, function(val, key) {
                return key;
              });
              site.environments.sort();
              return site;
            });
          });
        });
      });
    };

  });

};
