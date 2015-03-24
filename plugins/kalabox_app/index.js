'use strict';

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var async = require('async');
var rimraf = require('rimraf');

module.exports = function(kbox, app) {

  var argv = kbox.core.deps.lookup('argv');
  var appConfig = app.config;
  var events = kbox.core.events;
  var tasks = kbox.core.tasks;

  tasks.registerTask([app.name, 'config'], function(done) {
    var query = argv._[0];
    var target = appConfig;
    if (query !== undefined) {
      target = target[query];
    }
    console.log(JSON.stringify(target, null, '\t'));
    done();
  });

  tasks.registerTask([app.name, 'containers'], function(done) {
    kbox.engine.list(app.name, function(err, containers) {
      if (err) {
        done(err);
      } else {
        async.each(containers,
        function(container, next) {
          kbox.engine.info(container.id, function(err, info) {
            if (err) {
              next(err);
            } else {
              if (info) {
                console.log(JSON.stringify(info, null, '  '));
              }
              next();
            }
          });
        },
        function(err) {
          done(err);
        });
      }
    });
  });

  tasks.registerTask([app.name, 'inspect'], function(done) {
    var targetName = argv._[0];
    kbox.engine.list(app.name, function(err, containers) {
      if (err) {
        done(err);
      } else {
        var target = _.find(containers, function(container) {
          return container.name === targetName;
        });
        if (target === undefined) {
          done(new Error('No item named "' + targetName + '" found!'));
        } else {
          kbox.engine.inspect(target.id, function(err, data) {
            if (err) {
              done(err);
            } else {
              console.log(data);
              done();
            }
          });
        }
      }
    });
  });

  tasks.registerTask([app.name, 'install'], function(done) {
    kbox.app.install(app, done);
  });

  tasks.registerTask([app.name, 'uninstall'], function(done) {
    kbox.app.uninstall(app, done);
  });

  tasks.registerTask([app.name, 'start'], function(done) {
    kbox.app.start(app, done);
  });

  tasks.registerTask([app.name, 'stop'], function(done) {
    kbox.app.stop(app, done);
  });

  tasks.registerTask([app.name, 'restart'], function(done) {
    kbox.app.restart(app, done);
  });

  // Events
  /*events.on('pre-install', function(app, done) {
    if (fs.existsSync(app.config.appRoot)) {
      kbox.app.installPackages(app.config.appRoot, done);
    }
  });*/

};
