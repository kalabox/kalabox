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
  var share = require('./share.js')(kbox);

  // Create a serializer so only one syncthing action will happen at a time.
  var serializer = new kbox.util.Serializer();

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
   * Add a "first sync" property to the app if this is a create even
   */
  kbox.core.events.on('pre-create-app', function(config) {
    config.pluginconfig.sharing.firstTime = true;
  });

  /*
   * Turn off the local sycnthing when the engine goes down
   * this is only relevant on non-linux
   */
  if (process.platform !== 'linux') {
    kbox.core.events.on('pre-engine-down', function() {
      // Run through serializer.
      return serializer.enqueue(function() {
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
    });
  }

  /*
   * App events
   */
  kbox.core.events.on('post-app-load', function(app) {

    // Our default syncthing configuration
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

    // Set the official syncthning config and remove the old one
    app.config.sharing = config;
    delete app.config.pluginconfig.sharing;

    /*
     * Restart our shares
     * Only applicable on nonlinux
     */
    if (process.platform !== 'linux') {
      app.events.on('pre-stop', function() {
        // Run through serializer.
        app.status('Waiting for code sharing.');
        return serializer.enqueue(function() {
          if (app.config.sharing.share) {
            app.status('Stopping code sharing.');
            // Run through serializer.
            return share.restart();
          }
        });
      });
    }

    /*
     * Restart our shares
     * When we start an app make sure we mount the share to the correct
     * containers webroot
     */
    app.events.on('pre-start', 1, function() {

      /*
       * Helper function to get our syncthing mount
       */
      var syncMount = function(codeRoot) {

        // Write the local ignore file
        return Promise.try(function() {
          var shareIgnores = app.config.sharing.ignore.join(os.EOL);
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
          var codeRootSplit = app.config.sharing.codeRoot.split(path.sep);
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

        // Inspect syncthing
        .then(function() {
          return kbox.engine.inspect(syncthingContainer());
        })

        // Return syncthing code mount.
        .then(function(data) {
          var mount = _.result(_.find(data.Mounts, function(mount) {
            return mount.Destination === '/code';
          }), 'Source');
          return mount + '/' + app.name;
        });

      };

      // Run through serializer.
      app.status('Waiting for code sharing.');
      return serializer.enqueue(function() {

        if (app.config.sharing.share) {

          app.status('Sharing code.');

          // Get the host code root
          var codeRoot = app.config.sharing.codeRoot;

          // Make sure our code root exist
          return Promise.fromNode(function(cb) {
            fs.mkdirp(codeRoot, cb);
          })

          // Add the sharing mount to container with the webroot at that webroot
          .then(function() {
            if (process.platform !== 'linux') {
              return syncMount(codeRoot);
            }
            else {
              return codeRoot;
            }
          })

          // Create an override kalabox-compose yaml that contains
          // the volumezzz
          .then(function(syncMount) {

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
                var vol = [syncMount, webRoot].join(':');
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

    /*
     * Clear app folder when the app is uninstalled.
     * This is only applicable on non-linux
     */
    if (process.platform !== 'linux') {
      app.events.on('post-uninstall', function() {

        // Run through serializer.
        return serializer.enqueue(function() {

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

      });
    }

    /*
     * Delete the code volume on a destroy
     * This is only applicable on non-linux
     */
    if (process.platform !== 'linux') {
      app.events.on('post-destroy', function() {

        // Run through serializer.
        return serializer.enqueue(function() {

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
    }

  });

};
