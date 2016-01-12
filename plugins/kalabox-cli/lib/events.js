'use strict';

module.exports = function(kbox) {

  // Node
  var path = require('path');

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

      // Add our CLI tools
      kbox.core.events.on('pre-app-start', function(app, done) {
        app.composeCore.push(path.join(app.root, 'kalabox-cli.yml'));
        done();
      });

      // Remove our CLI tools
      kbox.core.events.on('pre-app-uninstall', function(app, done) {
        app.composeCore.push(path.join(app.root, 'kalabox-cli.yml'));
        done();
      });

      // Rebuild our CLI tools
      kbox.core.events.on('pre-app-rebuild', function(app, done) {
        app.composeCore.push(path.join(app.root, 'kalabox-cli.yml'));
        done();
      });

    }

  });

};
