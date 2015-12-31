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
   * Helper functon to add data volume to all our containers
   */
  var addDataVolumes = function(files) {

    files = files;

    // App datacontainer
    // jscs:disable
    /* jshint ignore:start */
    var dataContainer = '$KALABOX_APP_DATA_CONTAINER_NAME';

    // Start them up
    var currentCompose = {};
    var newCompose = {};

    // Get our composed things
    _.forEach(files, function(file)  {
      _.extend(currentCompose, kbox.util.yaml.toJson(file));
    });

    // Add datavolumes
    _.forEach(currentCompose, function(value, key)  {
      if (Array.isArray(value.volumes_from)) {
        value.volumes_from.push(dataContainer);
      }
      else {
        value.volumes_from = [dataContainer];
      }
      var obj = {};
      obj[key] = {volumes_from: value.volumes_from};
      _.extend(newCompose, obj);
    });

    return newCompose;
    // jscs:enable
    /* jshint ignore:end */

  };

  // Add a datacontainer for each app and then volumes from that container
  // on all the apps containers
  events.on('pre-app-start-before', function(app) {

    // Create dir to store this stuff
    var tmpDir = path.join(kbox.util.disk.getTempDir(), app.name);
    fs.mkdirpSync(tmpDir);

    // Add teh data container
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

    // Create data yml
    var dataYmlFile = path.join(tmpDir, 'data.yml');
    kbox.util.yaml.toYamlFile(composeData, dataYmlFile);

    // Add the data yml to the create
    app.composeBefore.push(dataYmlFile);

    // Add the volumes from to the core and after compose
    _.forEach([app.composeCore, app.composeAfter], function(compose) {
      var volumesYaml = addDataVolumes(compose);
      if (!_.isEmpty(volumesYaml)) {
        var seed = Date.now().toString() + Math.random().toString();
        var fileName = crypto.createHash('sha1').update(seed).digest('hex');
        var dataYmlFile = path.join(tmpDir, fileName + '.yml');
        kbox.util.yaml.toYamlFile(volumesYaml, dataYmlFile);
        compose.push(dataYmlFile);
      }
    });

  });

  // Destroy data contanier
  events.on('pre-app-destroy', function(app) {
    app.components.push({containerName: app.dataContainerName});
  });

};
