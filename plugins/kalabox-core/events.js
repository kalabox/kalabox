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
          var containerIdFile = path.join(app.config.appCidsRoot, 'data');
          app.components.push({
            image: {
              name: 'data',
              srcRoot: deps.lookup('globalConfig').srcRoot
            },
            name: 'data',
            appDomain: app.domain,
            dataContainerName: null,
            containerName: containerName,
            containerIdFile: containerIdFile,
            containerId: containerName
          });
        }
        done();
      }
    });
  });

  // Turn the engine off if after an app start we don't have any other apps
  // running
  events.on('post-stop', function(app, done) {

    // Keep refernece for later.
    var self = this;

    // Get list of app names.
    util.getAppNames()
    // Map app names to an object.
    .then(function(appNames) {
      // Reduce app names to an object of app stats.
      return Promise.reduce(appNames, function(obj, appName) {
        return util.getAppStats(appName)
        .then(function(stats) {
          if (stats.running > 0) {
            return stats;
          }
        });
      }, {});
    })

    .then(function(result) {
      // Turn off the engine if we dont have any running apps
      if (result === undefined || result.running < 0) {
        return kbox.engine.down();
      }
    })

    .nodeify(done);

  });

};
