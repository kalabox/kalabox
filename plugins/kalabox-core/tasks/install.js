'use strict';

var path = require('path');
var _ = require('lodash');

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var events = kbox.core.events;
  var deps = kbox.core.deps;

  kbox.whenApp(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'install'];
      task.description = 'Install a kbox application.';
      task.options.push({
        name: 'build-local',
        kind: 'boolean',
        description: 'Build images locally instead of pulling them remotely.'
      });
      task.func = function(done) {
        kbox.app.install(app, done);
      };
    });
  });

  // Event to add in our data container if it doesn't exist
  events.on('pre-install', function(app, done) {
    kbox.engine.list(app.name, function(err, containers) {
      if (err) {
        done(err);
      }
      else {
        var containerName = ['kb', app.name, 'data'].join('_');
        var hasData = _.find(containers, function(container) {
          return container.name === containerName;
        });
        if (_.isEmpty(hasData)) {
          var containerIdFile = path.join(app.config.appCidsRoot, 'data');
          app.components.data = {
            image: {
              name: 'data',
              srcRoot: deps.lookup('globalConfig').srcRoot
            },
            name: 'data',
            appDomain: app.domain,
            dataContainerName: null,
            containerName: containerName,
            containerIdFile: containerIdFile
          };
        }
        done();
      }
    });
  });

};
