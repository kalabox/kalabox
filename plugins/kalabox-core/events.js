'use strict';

module.exports = function(kbox) {

  // Intrinsic
  var path = require('path');

  // Npm modules
  var fs = require('fs-extra');

  // Kalabox modules
  var events = kbox.core.events.context();

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

  // Destroy data contanier
  events.on('pre-app-destroy', function(app) {
    app.components.push({containerName: app.dataContainerName});
  });

};
