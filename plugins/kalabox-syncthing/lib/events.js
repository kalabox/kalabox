'use strict';

module.exports = function(kbox) {

  // Node
  var path = require('path');
  var os = require('os');

  // NPM
  var _ = require('lodash');
  var fs = require('fs-extra');

  // Kalabox
  var Promise = kbox.Promise;
  var events = kbox.core.events.context();
  var share = require('./share.js')(kbox);

  // Syncthing container
  var syncthingContainer = function() {
    return {
      compose: [path.resolve(__dirname, '..', 'kalabox-compose.yml')],
      project: 'kalabox',
      opts: {
        services: ['syncthing'],
        internal: true
      }
    };
  };

  /*
   * Mix in our with default syncthing config and set into the app
   */
  events.on('post-app-create', function(app) {

    // Our default syncthing configuration
    var defaultConfig = kbox.core.config.normalize({
      codeDir: 'code',
      codeRoot: path.join(app.root, ':codeDir:'),
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
        'Icon',
        'Thumbs.db',
        'ehthumbs.db'
      ]
    });

    // Mix in our user config if we have it
    var config = defaultConfig;
    if (app.config.pluginconfig.syncthing) {
      config = _.merge(config, app.config.pluginconfig.syncthing);
    }

    // Set the official syncthning config and remove the old one
    app.config.syncthing = config;
    delete app.config.pluginconfig.syncthing;

  });

  /*
   * Turn off the local sycnthing when the engine goes down
   */
  events.on('pre-engine-down', function() {
    // Get local sync instance
    return share.getLocalSync()
    .then(function(localSync) {
      // Check if it's up
      return localSync.isUp()
      .then(function(isUp) {
        if (isUp) {
          // If it's up, then shut'er down.
          return localSync.shutdown();
        }
      });
    });

  });

  /*
   * App events
   */
  kbox.whenAppRegistered(function(app) {

    /*
     * Restart our shares
     */
    events.on('pre-app-stop', function() {
      if (app.config.syncthing.share) {
        kbox.core.log.status('Stopping code sharing.');
        return share.restart();
      }
    });

    /*
     * Restart our shares
     * When we start an app make sure we mount the share to the correct
     * containers webroot
     */
    events.on('pre-app-start', 1, function(app) {

      if (app.config.syncthing.share) {

        kbox.core.log.status('Sharing code.');

        // Get the host code root
        var codeRoot = app.config.syncthing.codeRoot;

        // Make sure our code root exist
        return Promise.fromNode(function(cb) {
          fs.mkdirp(codeRoot, cb);
        })

        // Write the local ignore file
        // for
        .then(function() {
          var shareIgnores = app.config.syncthing.ignore.join(os.EOL);
          var stignoreFile = path.join(codeRoot, '.stignore');
          return Promise.fromNode(function(cb) {
            fs.writeFile(stignoreFile, shareIgnores, cb);
          });
        })

        // Refresh our syncthing situation
        .then(function() {
          return share.restart();
        })

        // Make sure remote dir exists
        .then(function() {
          // Command to make query.
          var createCmd = [
            '-p',
            '/code/' + app.name
          ];
          // Build run definition
          var createDef = syncthingContainer();
          createDef.opts.entrypoint = '/bin/mkdir';
          createDef.opts.cmd = createCmd;
          return kbox.engine.run(createDef);
        })

        // Make sure it has a .stfolder file
        .then(function() {
          // Command to make query.
          var touchCmd = ['/code/' + app.name + '/.stfolder'];
          // Build run definition
          var touchDef = syncthingContainer();
          touchDef.opts.entrypoint = 'touch';
          touchDef.opts.cmd = touchCmd;
          return kbox.engine.run(touchDef);
        })

        // Write the remote ignore file
        .then(function() {

          // Compute the remote ignore file location
          var home = kbox.core.deps.get('globalConfig').home;
          var homeSplit = home.split(path.sep);
          var codeRootSplit = app.config.syncthing.codeRoot.split(path.sep);
          var remoteDir = _.drop(codeRootSplit, homeSplit.length).join('/');

          // Command to make query.
          var cpCmd = [
            '/src/' + remoteDir + '/.stignore',
            '/code/' + app.name + '/.stignore'
          ];
          // Build run definition
          var runDef = syncthingContainer();
          runDef.opts.entrypoint = '/bin/cp';
          runDef.opts.cmd = cpCmd;
          return kbox.engine.run(runDef);
        })

        // Add the sharing mount to container with the webroot at that webroot
        .then(function() {

          // Inspect syncthing
          return kbox.engine.inspect(syncthingContainer())

          // Return syncthing code mount.
          .then(function(data) {
            return _.result(_.find(data.Mounts, function(mount) {
              return mount.Destination === '/code';
            }), 'Source');
          })

          // Create an override kalabox-compose yaml that contains
          // the volumezzz
          .then(function(syncMount) {

            // Get our stuff from the sync config
            var parts = app.config.syncthing.share.split(':');
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
                var vol = syncMount + '/' + app.name + ':' + webRoot;
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
        });
      }
    });

    /*
     * Clear app folder when the app is uninstalled.
     */
    events.on('post-app-uninstall', function(app) {

      // Array the syncthing instances
      var syncs = [share.getRemoteSync(), share.getLocalSync()];

      // Remove our folders
      return Promise.each(syncs, function(sync) {
        return sync.isUp()
        .then(function(isUp) {
          if (isUp) {
            return sync.clearFolder(app.name)
            .then(function() {
              return sync.restartWait();
            });
          }
        });
      });

    });

    /*
     * Delete the code volume on a destroy
     */
    events.on('post-app-destroy', function(app) {

      // Command to remove
      var rmCmd = [
        '-rf',
        '/code/' + app.name
      ];

      // Build kill definition
      var rmDef = syncthingContainer();
      rmDef.opts.entrypoint = 'rm';
      rmDef.opts.cmd = rmCmd;

      // Run the kill
      return kbox.engine.run(rmDef);

    });

  });

};
