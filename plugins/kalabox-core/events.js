'use strict';

module.exports = function(kbox) {

  // Intrinsic
  var path = require('path');

  // Npm modules
  var _ = require('lodash');

  // Kalabox modules
  var events = kbox.core.events;
  var deps = kbox.core.deps;
  var app = kbox.apps;
  var util = require('./util.js')(kbox);
  var Promise = kbox.Promise;

  // EVENTS
  // Add some helpful vars to our containers
  events.on('pre-engine-create', function(createOptions, done) {
    var envs = [];
    var codeRoot = deps.lookup('globalConfig').codeDir;
    var kboxCode = 'KBOX_CODEDIR=' + codeRoot;
    envs.push(kboxCode);
    envs.push('KALABOX=true');

    // Add some app opts
    kbox.ifApp(function(app) {
      envs.push('APPNAME=' + app.name);
      envs.push('APPDOMAIN=' + app.domain);
    });

    if (createOptions.Env) {
      envs.forEach(function(env) {
        if (!_.includes(createOptions.Env, env)) {
          createOptions.Env.push(env);
        }
      });
    }
    else {
      createOptions.Env = envs;
    }
    done();
  });

  // Event to add in our data container if it doesn't exist
  events.on('pre-install', function(app, done) {
    kbox.engine.list(app.name, function(err, containers) {
      if (err) {
        done(err);
      }
      else {
        // @todo: @bcauldwell - Refactor this.
        var containerName = ['kb', app.name, 'data'].join('_');
        var hasData = _.find(containers, function(container) {
          return container.name === containerName;
        });
        if (_.isEmpty(hasData)) {
          var cidFile = path.join(app.config.appCidsRoot, containerName);
          app.components.push({
            image: {
              name: 'data',
              srcRoot: deps.lookup('globalConfig').srcRoot
            },
            name: 'data',
            appDomain: app.domain,
            dataContainerName: null,
            containerName: containerName,
            containerIdFile: cidFile,
            containerId: containerName
          });
        }
        done();
      }
    });
  });

};
