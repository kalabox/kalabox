
'use strict';

module.exports = function(kbox) {

  // Load some boxmods
  var events = kbox.core.events.context('29b1da3b-e0d0-49e3-a343-ea558a21c6e2');

  /*
   * Add some other important things to our kalabox.yml before
   * creating it
   */
  events.on('pre-create-configure', function(config) {

    // Only run if this is a drupal app
    if (config.type === 'drupal') {
      // Set the drupal version into the config
      var drupalVersion = kbox.core.deps.get('argv').payload.pop();
      config.pluginconfig.drupal.version = drupalVersion.replace('drupal', '');
    }

  });

};
