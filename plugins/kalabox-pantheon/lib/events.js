
'use strict';

module.exports = function(kbox, pantheon) {

  // npm modules
  var _ = require('lodash');

  // Load some boxmods
  var events = kbox.core.events.context('29b1da3b-e0d0-49e3-a343-ea528a21c6e2');

  // Kalabox modules
  var Promise = kbox.Promise;

  // Events
  // pre-create-instantiate
  // Add some other important things to our kalabox.json before
  // creating it
  events.on('pre-create-instantiate', function(kalaboxJson, done) {

    /*
     * If site does not have a php version set then grab the default one
     */
    var getPhpVersion = function(site) {

      // jshint camelcase:false
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      // If our site info has a php version
      if (site.php_version && site.php_version === 55) {
        return site.php_version === 55 ? '5.5.24' : '5.3.29';
      }
      // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
      // jshint camelcase:true

      // If not we grab the default for hte framwork
      var framework = site.framework;
      var needs55 = framework === 'drupal8' || framework === 'wordpress';
      return needs55 ? '5.5.24' : '5.3.29';
    };

    // Grab our current pantheon config and any argv opts we may have
    var pantheonConfig = kalaboxJson.pluginConf['kalabox-plugin-pantheon'];
    var options = kbox.core.deps.get('argv').options;

    // If we are in pure non-iteractive we may need to auth
    return Promise.try(function() {
      // Figure out if we need to auth first or not
      return pantheon.sites === undefined;
    })

    // Auth if we need to
    .then(function() {

      // Login to the pantheon
      return pantheon.auth(pantheonConfig.account, options.password)

      // Return sites to be used
      .then(function() {
        return pantheon.getSites();
      });
    })

    // Update our config with relevant info
    .then(function(pSites) {
      if (pantheonConfig) {
        // Get cached site info
        var sites = pantheon.sites || pSites;
        // Get the UUID
        var uuid = _.findKey(sites, function(site) {
          return site.information.name === pantheonConfig.site;
        });
        var site = sites[uuid].information;

        // Set various kbox.json properties
        pantheonConfig.framework = pantheonConfig.framework || site.framework;
        pantheonConfig.php = getPhpVersion(site);
        pantheonConfig.upstream = site.upstream;
        var drushversion = pantheonConfig.framework === 'drupal8' ? '8' : '6';
        pantheonConfig['drush-version'] = drushversion;

        // Rebuild json
        kalaboxJson.pluginConf['kalabox-plugin-pantheon'] = pantheonConfig;
      }
    })

    // Go home Sam
    .nodeify(done);
  });

};
