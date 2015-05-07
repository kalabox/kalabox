'use strict';

var fs = require('fs-extra');
var os = require('os');
var path = require('path');

module.exports = function(kbox) {

  var events = kbox.core.events;
  var share = kbox.share;
  var deps = kbox.core.deps;

  // EVENT: pre-down
  events.on('pre-down', function(done) {
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
    .then(function() {
      done();
    })
    .catch(function(err) {
      done(err);
    });
  });

  kbox.whenApp(function(app) {

    var globalConfig = kbox.core.deps.lookup('globalConfig');
    var engine = kbox.engine;
    var events = kbox.core.events;
    var tasks = kbox.core.tasks;
    var share = kbox.share;

    var shareIgnores = app.config.shareIgnores.join(os.EOL);
    var stignoreFile = path.join(app.config.codeRoot, '.stignore');
    var sharing = globalConfig.sharing;

    var prettyPrint = function(obj) {
      console.log(JSON.stringify(obj, null, '  '));
    };

    var printConfig = function(which) {
      kbox.tasks.add(function(task) {
        task.path = ['sync', which, 'config'];
        task.description = 'Display syncthing instance config.';
        task.func = function(done) {
          var instance;
          if (which === 'local') {
            instance = share.getLocalSync;
          } else if (which === 'remote') {
            instance = share.getRemoteSync;
          } else {
            var msg = 'The option [' + which + '] is invalid, please choose ' +
              'either local or remote.';
            done(new Error(msg));
          }
          instance()
          .then(function(sync) {
            sync.getConfig()
            .then(function(config) {
              prettyPrint(config);
              done(null);
            })
            .catch(function(err) {
              done(err);
            });
          });
        };
      });
    };

    if (sharing) {

      // @todo: bcauldwell - Commenting these two out for now, until we
      // need them, and find a good place for them.
      //printConfig('local');
      //printConfig('remote');

      // APP EVENT: pre-start
      // Set up an ignore file if needed
      events.on('pre-start', function(app, done) {
        // Add a local .stignore file
        if (!fs.existsSync(app.config.codeRoot)) {
          fs.mkdirpSync(app.config.codeRoot);
        }
        fs.writeFileSync(stignoreFile, shareIgnores);

        // Add a remote .stignore
        var codeDir = deps.lookup('globalConfig').codeDir;
        var cmd = [
          'cp',
          '/src/' + codeDir + '/.stignore',
          '/' + codeDir + '/.stignore'
        ];
        engine.once(
          'debian',
          ['/bin/bash'],
          {
            'Env': ['APPDOMAIN=' + app.domain],
            HostConfig: {
              VolumesFrom: [app.dataContainerName]
            }
          },
          {
            Binds: [app.rootBind + ':/src:rw']
          },
          function(container, done) {
            engine.queryData(container.id, cmd, function(err, data) {
              if (err) {
                done(err);
              } else {
                done();
              }
            });
          },
          function(err) {
            done(err);
          }
        );
      });

      events.on('post-stop', function(app, done) {
        share.restart(done);
      });

      events.on('post-start', function(app, done) {
        share.restart(done);
      });
    }

  });

};
