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

    // Get the remote service and webroot
    var parts = app.config.sharing.share.split(':');
    var webService = parts[0];
    var webRoot = parts[1];

    return {
      unison: {
        image: 'kalabox/unison:stable',
        restart: 'always',
        environment: {
          'UNISON_WEBROOT': webRoot,
          'UNISON_CODEROOT': '/src/' + app.config.sharing.codeDir,
          'UNISON_OPTIONS': ''
        },
        volumes: [
          '$KALABOX_APP_ROOT_BIND:/src'
        ],
        'volumes_from': [webService]
      }
    };
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
        '*.7z',
        '*.bz2',
        '*.dmg',
        '*.gz',
        '*.iso',
        '*.jar',
        '*.rar',
        '*.tar',
        '*.tgz',
        '*.un~',
        '*.zip',
        '.*.swp',
        '.*DS_Store',
        '.DS_Store*',
        '._*',
        '.sass-cache',
        'Thumbs.db',
        'ehthumbs.db'
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
