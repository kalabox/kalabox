'use strict';

module.exports = function(kbox) {

  // Node
  var path = require('path');
  var fs = require('fs');

  // NPM Modules
  var _ = require('lodash');

  // Kalabox modules
  var env = kbox.core.env;

  /*
   * Grab our cli config
   */
  kbox.whenAppRegistered(function(app) {

    /**
     * Add our cli yaml file into the mix
     */
    if (_.get(app.config.pluginconfig, 'cli') === 'on') {

      // Set a default value of null for this here so we dont
      // mess up other stuff
      env.setEnv('KALABOX_CLI_WORKING_DIR', '');

      // Grab the default compose file
      var composeFiles = [path.join(app.root, 'kalabox-cli.yml')];

      // Allow other things to add task files
      return kbox.core.events.emit('cli-add-composefiles', composeFiles)

      // Then load all the composefiles up
      .then(function() {

        // Check for our tasks and then generate tasks if the file
        // exists
        _.forEach(composeFiles, function(composeFile) {

          if (fs.existsSync(composeFile)) {
            app.composeCore.push(composeFile);
          }

        });

        // Make sure we are always unique
        app.composeCore = _.uniq(app.composeCore);

      });

    }

  });

};
