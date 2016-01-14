
'use strict';

module.exports = function(kbox, pantheon) {

  // npm modules
  var _ = require('lodash');

  // Load some boxmods
  var events = kbox.core.events.context('29b1da3b-e0d0-49e3-a343-ea528a21c6e2');

  /*
   * Add some other important things to our kalabox.yml before
   * creating it
   */
  events.on('pre-create-configure', function(config) {

    // Grab the current config
    var pantheonConfig = config.pluginconfig.pantheon;

    // Get site info
    return pantheon.getSites()

    // Update our config with relevant info
    .then(function(pSites) {
      // Get cached site info
      var sites = pantheon.sites || pSites;
      // Get the UUID
      var uuid = _.findKey(sites, function(site) {
        return site.information.name === pantheonConfig.site;
      });
      var site = sites[uuid].information;

      // Set various kbox.json properties
      pantheonConfig.framework = pantheonConfig.framework || site.framework;
      // jshint camelcase:false
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      pantheonConfig.php = site.php_version || 53;
      // jshint camelcase:true
      // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
      pantheonConfig.upstream = site.upstream;
      pantheonConfig.name = pantheon.session.name;

      // Remove password
      delete pantheonConfig.password;

      // Rebuild json
      config.pluginconfig.pantheon = pantheonConfig;
    });

  });

  /*
   * Make sure our pantheon SSH keys are set up
   */
  events.on('post-create-configure', function(app) {

    // Load the pantheon api client
    var Client = require('./client.js');
    pantheon = new Client(kbox, app);

    // Set the correct session
    // @todo: it feels weird to have to do this again
    var account = app.pluginconfig.pantheon.email;
    pantheon.setSession(pantheon.getSessionFile(account));

    // Make sure we have SSH keys that can communciate with pantheon
    return pantheon.sshKeySetup();

  });

};
