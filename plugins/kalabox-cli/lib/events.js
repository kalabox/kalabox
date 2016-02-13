'use strict';

module.exports = function(kbox) {

  // Node
  var path = require('path');

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

      // Uniquely add our cli tools
      var cliCompose = path.join(app.root, 'kalabox-cli.yml');
      app.composeCore.push(cliCompose);
      app.composeCore = _.uniq(app.composeCore);

      // Set a default value of null for this here so we dont
      // mess up other stuff
      env.setEnv('KALABOX_CLI_WORKING_DIR', '');

    }

  });

};
