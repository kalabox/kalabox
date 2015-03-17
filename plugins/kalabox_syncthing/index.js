'use strict';

var fs = require('fs');
var mkdirp = require('mkdirp');
var os = require('os');
var path = require('path');

module.exports = function(argv, app, appConfig, engine, events, kbox) {

  var tasks = kbox.core.tasks;

  var prettyPrint = function(obj) {
    console.log(JSON.stringify(obj, null, '  '));
  };

  var printConfig = function(which) {
    tasks.registerTask(['sync', which, 'config'], function(done) {
      var instance;
      if (which === 'local') {
        instance = kbox.share.getLocalSync;
      } else if (which === 'remote') {
        instance = kbox.share.getRemoteSync;
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
    });
  };

  printConfig('local');
  printConfig('remote');

  // APP EVENT: pre-start
  // Set up an ignore file if needed
  var shareIgnores = app.config.shareIgnores.join(os.EOL);
  var stignoreFile = path.join(app.config.codeRoot, '.stignore');
  events.on('pre-start', function(app, done) {
    // Add a local .stignore file
    if (!fs.existsSync(app.config.codeRoot)) {
      mkdirp.sync(app.config.codeRoot);
    }
    fs.writeFileSync(stignoreFile, shareIgnores);
    done();
  });

  events.on('post-start', function(app, done) {
    // Add a remote .stignore
    var cmd = ['cp', '/src/code/.stignore', '/data/.stignore'];
    kbox.engine.once(
      'kalabox/debian:stable',
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
        console.log(container);
        kbox.engine.queryData(container.id, cmd, function(err, data) {
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
};
