'use strict';

var _ = require('lodash');

module.exports = function(kbox) {

  var events = kbox.core.events;
  var deps = kbox.core.deps;

  // EVENT: pre-engine-create
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

};
