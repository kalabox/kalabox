'use strict';

module.exports = function(kbox) {

  // Node
  var path = require('path');

  // NPM Modules
  var _ = require('lodash');

  /*
   * Grab our cli config
   */
  kbox.whenAppRegistered(function(app) {

    // Check whether we should load these task or not
    var buildImages = (app.config.pluginconfig.cli === 'on') ? true : false;

    /**
     * Build our needed cli images for usage
     */
    if (buildImages) {

      // Uniquely add our cli tools
      var cliCompose = path.join(app.root, 'kalabox-cli.yml');
      app.composeCore.push(cliCompose);
      app.composeCore = _.uniq(app.composeCore);

    }

  });

};
