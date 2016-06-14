'use strict';

module.exports = function(kbox) {

  // @todo: multi-app-events

  // Node
  var path = require('path');
  var fs = require('fs');

  // NPM Modules
  var _ = require('lodash');

  /*
   * Add in extra compose files if they are there
   */
  kbox.core.events.on('post-app-load', 1, function(app) {

    /**
     * Add our default cli yaml file into the mix
     */
    if (_.get(app.config.pluginconfig, 'cli') === 'on') {

      // Add a place to collect taskfiles
      app.taskFiles = [];

      // Set a default value of null for this here so we dont
      // mess up other stuff
      app.env.setEnv('KALABOX_CLI_WORKING_DIR', '');

      // Grab the default compose and cli files
      var defaultCliCompose = path.join(app.root, 'kalabox-cli.yml');
      var defaultTaskCompose = path.join(app.root, 'cli.yml');

      // If it exists let's add it to the mix
      if (fs.existsSync(defaultCliCompose)) {
        app.composeCore.push(defaultCliCompose);
      }

      // If it exists let's add it to the mix
      if (fs.existsSync(defaultTaskCompose)) {
        app.taskFiles.push(defaultTaskCompose);
      }

      // Make sure we are always unique
      app.composeCore = _.uniq(app.composeCore);
      app.taskFiles = _.uniq(app.taskFiles);

    }

  });

};
