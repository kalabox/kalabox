'use strict';

module.exports = function(kbox) {

  // Intrinsic
  var path = require('path');
  var crypto = require('crypto');

  // Npm modules
  var fs = require('fs-extra');
  var _ = require('lodash');

  // Kalabox modules
  var events = kbox.core.events.context();

  /*
   * Helper functon to add data volume to all our apps
   */
  var addDataVolumes = function(app) {

    // Create dir to store this stuff
    var tmpDir = path.join(kbox.util.disk.getTempDir(), app.name);
    fs.mkdirpSync(tmpDir);

    // Start them up
    var currentCompose = {};
    var newCompose = {};

    // Get our composed things
    _.forEach(app.composeCore, function(file)  {
      _.extend(currentCompose, kbox.util.yaml.toJson(file));
    });

    // jscs:disable
    /* jshint ignore:start */
    // Add datavolumes
    _.forEach(currentCompose, function(value, key)  {
      if (Array.isArray(value.volumes_from)) {
        value.volumes_from.push('kalaboxdata');
      }
      else {
        value.volumes_from = ['kalaboxdata'];
      }
      var obj = {};
      obj[key] = {volumes_from: _.uniq(value.volumes_from)};
      _.extend(newCompose, obj);
    });
    // jscs:enable
    /* jshint ignore:end */

    // Add data container itself
    newCompose.kalaboxdata = {
      image: 'kalabox/data:$KALABOX_IMG_VERSION'
    };

    if (!_.isEmpty(newCompose)) {
      var seed = Date.now().toString() + Math.random().toString();
      var fileName = crypto.createHash('sha1').update(seed).digest('hex');
      var newComposeFile = path.join(tmpDir, fileName + '.yml');
      kbox.util.yaml.toYamlFile(newCompose, newComposeFile);
      app.composeCore.push(newComposeFile);
    }

  };

  // Add a datacontainer for each app and then volumes from that container
  // on all the apps containers
  events.on('pre-app-start', 1, function(app) {
    addDataVolumes(app);
  });
  events.on('pre-app-destroy', 1, function(app) {
    addDataVolumes(app);
  });

};
