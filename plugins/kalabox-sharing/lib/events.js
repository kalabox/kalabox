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

    /*
     * Restart our shares
     * When we start an app make sure we mount the share to the correct
     * containers webroot
     */
    app.events.on('pre-start', 1, function() {

      // Run through serializer.
      app.status('Waiting for code sharing.');

      if (app.config.sharing.share) {

        app.status('Sharing code.');

        // Get the host code root
        var codeRoot = app.config.sharing.codeRoot;

        // @todo:
        // Get the webroot and service on which it exists

        // Make sure our code root exist
        return Promise.fromNode(function(cb) {
          fs.mkdirp(codeRoot, cb);
        })

        // @todo: Create a unison compose file and add it to the app
        // correctly
        .then(function() {

          // Get our stuff from the sync config
          var parts = app.config.sharing.share.split(':');
          var webService = parts[0];
          var webRoot = parts[1];

          // Create dir to store this stuff
          var tmpDir = path.join(kbox.util.disk.getTempDir(), app.name);
          fs.mkdirpSync(tmpDir);

          // Start them up
          var currentCompose = {};
          var newCompose = {};

          // Get our composed things
          _.forEach(app.composeCore, function(file)  {
            _.extend(currentCompose, kbox.util.yaml.toJson(file));
          });

          // Add sync to correct container
          _.forEach(currentCompose, function(value, key)  {
            if (key === webService) {
              var vol = [codeRoot, webRoot].join(':');
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

          if (!_.isEmpty(newCompose)) {
            var fileName = [app.name, _.uniqueId()].join('-');
            var newComposeFile = path.join(tmpDir, fileName + '.yml');
            kbox.util.yaml.toYamlFile(newCompose, newComposeFile);
            app.composeCore.push(newComposeFile);
          }

        });
      }
    });

  });

};
