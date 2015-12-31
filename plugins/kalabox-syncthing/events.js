'use strict';

var fs = require('fs-extra');
var os = require('os');
var path = require('path');
var Promise = require('bluebird');

module.exports = function(kbox) {

  // Create new event context.
  var events = kbox.core.events.context();
  var share = kbox.share;

  // EVENT: pre-down
  events.on('pre-app-down', function(done) {
    // Get local sync instance
    share.getLocalSync()
    .then(function(localSync) {
      // Check if it's up
      return localSync.isUp()
      .then(function(isUp) {
        if (isUp) {
          // If it's up, then shut'er down.
          return localSync.shutdown();
        }
      });
    })
    .nodeify(done);
  });

  kbox.whenAppRegistered(function(app) {

    var globalConfig = kbox.core.deps.lookup('globalConfig');
    var engine = kbox.engine;
    var share = kbox.share;

    var shareIgnores = app.config.shareIgnores.join(os.EOL);
    var stignoreFile = path.join(app.config.codeRoot, '.stignore');
    var sharing = globalConfig.sharing;

    if (sharing) {
      // APP EVENT: pre-start
      // Set up an ignore file if needed
      events.on('pre-app-start', function(app, done) {

        // Make sure code root exists.
        return Promise.fromNode(function(cb) {
          fs.mkdirp(app.config.codeRoot, cb);
        })
        // Write synthing ignore file.
        .then(function() {
          return Promise.fromNode(function(cb) {
            fs.writeFile(stignoreFile, shareIgnores, cb);
          });
        })
        .then(function() {

          // Get local code directory.
          var codeDir = app.config.codeDir;
          // Image to create container from.
          var image = 'syncthing';
          // Command to make query.
          var cpCmd = [
            'cp',
            '/src/' + codeDir + '/.stignore',
            '/code/.stignore'
          ];
          // Options for creating container.
          var createOpts = {
            'Env': ['APPDOMAIN=' + app.domain],
            HostConfig: {
              VolumesFrom: [app.dataContainerName]
            }
          };
          // Options for starting container.
          var startOpts = {
            Binds: [app.rootBind + ':/src:rw']
          };
          // Create one use container, then query it.
          var data = {
            rawImage: image,
            createOpts: createOpts,
            startOpts: startOpts,
            fn: function(container) {
              return engine.queryData({cid: container.id, cmd: cpCmd});
            }
          };
          return engine.use(data);
        })
        // Return.
        .nodeify(done);

      });

      events.on('post-app-stop', function(app, done) {
        share.restart(done);
      });

      events.on('post-app-start', function(app, done) {
        share.restart(done);
      });

      events.on('post-app-uninstall', function(app, done) {
        share.restart(done);
      });

    }

  });

};
