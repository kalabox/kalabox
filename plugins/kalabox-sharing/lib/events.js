'use strict';

module.exports = function(kbox) {

  // Node
  var path = require('path');

  // NPM
  var _ = require('lodash');
  var fs = require('fs-extra');

  // Kalabox
  var Promise = kbox.Promise;

  /*
   * Helper function to generate the appropriate sharing compose file on
   * WIN/OSX
   */
  var getSharingComposeNotLinux = function(app) {

    /*
     * Transform an  array of values into a common deliminated
     * string of option;value
     */
    var parsePathString = function(option, values) {

      // Start an opts collector
      var opts = [];

      // Add in ignores if they exist
      if (!_.isEmpty(values)) {
        _.forEach(values, function(value) {
          opts.push(option);
          opts.push(value);
        });
      }

      // Return as common deliminated string
      return opts.join(';');

    };

    /*
     * Get a list of unison options based on the platform
     */
    var getUnisonOptions = function() {

      // Start with our basic options
      var opts = ['-repeat', '1', '-retry', '5'];

      // Add in platform specific (FUCKING WINDOWS) options
      if (process.platform === 'win32') {
        opts.push('-fat');
        opts.push('-owner');
        opts.push('-group');
        opts.push('-numericids');
      }

      // Return our list
      return opts.join(' ');

    };

    // Get the remote service and webroot
    var parts = app.config.sharing.share.split(':');
    var webService = parts[0];
    var webRoot = parts[1];

    // Start the services collector
    var services = {};

    // Build the unison part
    services.unison = {
      image: 'kalabox/unison:stable',
      restart: 'always',
      environment: {
        'UNISON_WEBROOT': webRoot,
        'UNISON_CODEROOT': '/kalashare/' + app.config.sharing.codeDir,
        'UNISON_OPTIONS': getUnisonOptions(),
        'UNISON_IGNORE': parsePathString('-ignore', app.config.sharing.ignore),
        'UNISON_PATHS': parsePathString('-path', app.config.sharing.paths)
      },
      volumes: [
        '$KALABOX_APP_ROOT_BIND:/kalashare'
      ],
      'volumes_from': [webService]
    };

    // Build the webroot part
    services[webService] = {
      volumes: [webRoot]
    };

    // Return both
    return services;

  };

  /*
   * Helper function to generate the appropriate sharing compose file on
   * Linux
   */
  var getSharingComposeLinux = function(app) {

    // Start them up
    var currentCompose = {};
    var newCompose = {};

    // Get the remote service and webroot
    var parts = app.config.sharing.share.split(':');
    var webService = parts[0];
    var webRoot = parts[1];

    // Get our composed things
    _.forEach(app.composeCore, function(file)  {
      _.extend(currentCompose, kbox.util.yaml.toJson(file));
    });

    // Add sync to correct container
    _.forEach(currentCompose, function(value, key)  {
      if (key === webService) {
        var vol = [app.config.sharing.codeRoot, webRoot].join(':');
        if (Array.isArray(value.volumes)) {
          value.volumes.push(vol);
        }
        else {
          value.volumes = [vol];
        }
        var obj = {};
        obj[key] = {volumes: _.uniq(value.volumes)};
        _.extend(newCompose, obj);
      }
    });

    // Return our new compose
    return newCompose;

  };

  /*
   * Helper function to generate the appropriate sharing compose file
   */
  var getSharingCompose = function(app) {
    switch (process.platform) {
      case 'win32': return getSharingComposeNotLinux(app);
      case 'darwin': return getSharingComposeNotLinux(app);
      case 'linux': return getSharingComposeLinux(app);
    }
  };

  /*
   * App events
   */
  kbox.core.events.on('post-app-load', function(app) {

    // Our default sharing configuration
    var defaultConfig = kbox.core.config.normalize({
      codeDir: 'code',
      ignore: [
        'Name *.7z',
        'Name *.bz2',
        'Name *.dmg',
        'Name *.gz',
        'Name *.iso',
        'Name *.jar',
        'Name *.rar',
        'Name *.tar',
        'Name *.tgz',
        'Name *.un~',
        'Name *.zip',
        'Name .*.swp',
        'Name .DS_Store',
        'Name ._*',
        'Name .sass-cache',
        'Name Thumbs.db',
        'Name ehthumbs.db'
      ]
    });

    // Mix in our user config if we have it
    var config = defaultConfig;
    if (app.config.pluginconfig.sharing) {
      config = _.merge(config, app.config.pluginconfig.sharing);
    }

    // Set the codeRoot
    config.codeRoot = path.join(app.root, config.codeDir);

    // Set the official sharing config and remove the old one
    app.config.sharing = config;
    delete app.config.pluginconfig.sharing;

    if (app.config.sharing.share) {

      // Make sure our local code root exist
      return Promise.fromNode(function(cb) {
        fs.mkdirp(app.config.sharing.codeRoot, cb);
      })

      // Create a sharing compose file and add it to the app
      // correctly
      .then(function() {

        // Create dir to store this stuff
        var tmpDir = path.join(kbox.util.disk.getTempDir(), app.name);
        fs.mkdirpSync(tmpDir);

        // Get our sharing compose file
        var newCompose = getSharingCompose(app);

        if (!_.isEmpty(newCompose)) {
          var fileName = [app.name, _.uniqueId()].join('-');
          var newComposeFile = path.join(tmpDir, fileName + '.yml');
          kbox.util.yaml.toYamlFile(newCompose, newComposeFile);
          app.composeCore.push(newComposeFile);
        }

      });
    }

  });

};
