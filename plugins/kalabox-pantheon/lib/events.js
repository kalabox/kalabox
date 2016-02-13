
'use strict';

module.exports = function(kbox, pantheon) {

  // Node modules
  var path = require('path');

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

    // Set the image version
    // Get relevant config options
    var prod = kbox.util.yaml.toJson(path.join(__dirname, 'config.yml'));
    var locked = kbox.core.deps.get('globalConfig').locked;

    // Expose the correct pantheon img version
    pantheonConfig.images = (!locked) ? 'dev' : prod.url.prod;

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

      // Set various kbox.yml properties
      pantheonConfig.framework = pantheonConfig.framework || site.framework;
      // jshint camelcase:false
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      pantheonConfig.php = site.php_version || 53;
      pantheonConfig.upstream = site.upstream;

      // Remove password
      delete pantheonConfig.password;

      // Get the user profile
      var data = pantheon.__getAuthHeaders(pantheon.session);
      return pantheon.getProfile(pantheon.session.user_id, data);

    })

    .then(function(profile) {
      // jshint camelcase:false
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      pantheonConfig.name = profile.full_name;
      // Rebuild json
      config.pluginconfig.pantheon = pantheonConfig;
    });

  });

  /*
   * Make sure our pantheon SSH keys are set up
   */
  events.on('post-create-configure', function(app) {

    // Set the correct session
    // @todo: it feels weird to have to do this again
    var account = app.pluginconfig.pantheon.email;
    pantheon.setSession(account, pantheon.getSessionFile(account));

    // Make sure we have SSH keys that can communciate with pantheon
    return pantheon.sshKeySetup();

  });

};
