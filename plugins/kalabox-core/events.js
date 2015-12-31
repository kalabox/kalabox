'use strict';

module.exports = function(kbox) {

  // Intrinsic
  var path = require('path');

  // Npm modules
  var fs = require('fs-extra');
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

    var composeData = {
      data: {
        image: 'kalabox/data:$KALABOX_IMG_VERSION'
      }
    };

    // Data yaml def
    // jscs:disable
    /* jshint ignore:start */
    composeData.data.container_name = '$KALABOX_APP_DATA_CONTAINER_NAME';
    /* jshint ignore:end */
    // jscs:enable

    // Create dir for this
    var tmpDir = path.join(kbox.util.disk.getTempDir(), app.name);
    fs.mkdirpSync(tmpDir);

    // Create data yml
    var dataYmlFile = path.join(tmpDir, 'data.yml');
    kbox.util.yaml.toYamlFile(composeData, dataYmlFile);

    // Add the data yml to the start
    app.composeBefore.push(dataYmlFile);
  });

};
