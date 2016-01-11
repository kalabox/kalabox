
'use strict';

module.exports = function(kbox, pantheon) {

  // npm modules
  var _ = require('lodash');

  // Load some boxmods
  var events = kbox.core.events.context('29b1da3b-e0d0-49e3-a343-ea528a21c6e2');

  // Events
  // pre-create-instantiate
  // Add some other important things to our kalabox.yml before
  // creating it
  events.on('pre-create-configure', function(config) {

    // Only do this on pantheon apps
    if (config.type === 'pantheon') {

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

        // Remove password
        delete pantheonConfig.password;

        // Rebuild json
        config.pluginconfig.pantheon = pantheonConfig;
      });
    }
  });

};
