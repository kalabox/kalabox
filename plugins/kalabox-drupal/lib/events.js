
'use strict';

module.exports = function(kbox, frameworks) {

  // npm modules
  var _ = require('lodash');

  // Load some boxmods
  var events = kbox.core.events.context('29b1da3b-e0d0-49e3-a343-ea558a21c6e2');

  /*
   * Add some other important things to our kalabox.yml before
   * creating it
   */
  events.on('pre-create-configure', function(config) {

    if (_.includes(frameworks, config.type)) {
      // Set the drupal version into the config
      var drupalVersion = kbox.core.deps.get('argv').payload.pop();
      config.pluginconfig.drupal = drupalVersion.replace('drupal', '');
    }

  });

};
