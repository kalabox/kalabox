'use strict';

module.exports = function(kbox) {

  var events = kbox.core.events;
  var deps = kbox.core.deps;
  var envs = [];

  // EVENT: pre-engine-create
  events.on('pre-engine-create', function(createOptions, done) {
    var codeRoot = deps.lookup('globalConfig').codeDir;
    var kboxCode = 'KBOX_CODEDIR=' + codeRoot;
    envs.push(kboxCode);
    envs.push('KALABOX=true');

    // Add some app opts
    kbox.whenApp(function(app) {
      envs.push('APPNAME=' + app.name);
      envs.push('APPDOMAIN=' + app.domain);
    });

    if (createOptions.Env) {
      envs.forEach(function(env) {
        createOptions.Env.push(env);
      });
    }
    else {
      createOptions.Env = envs;
    }
    console.log(createOptions);
    done();
  });

};
