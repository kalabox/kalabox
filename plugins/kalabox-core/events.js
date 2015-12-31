'use strict';

module.exports = function(kbox) {

  // Intrinsic
  var path = require('path');

  // Npm modules
  //var _ = require('lodash');

  // Kalabox modules
  var events = kbox.core.events.context();
  //var deps = kbox.core.deps;

  // EVENTS
  // Add some helpful vars to our containers
  /*
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
  */

  // Start a data container on all apps
  events.on('pre-app-start', function(app) {
    app.composeExtra.push(path.join(__dirname, 'kalabox-compose-app.yml'));
  });

};
