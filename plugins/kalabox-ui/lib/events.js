'use strict';

/*
 * Plugin manages a utility container for each app called the token container.
 * If the token container is running then the app can be assumed to be
 * running, if it is stopped the app can be assumed to be stopped, and if the
 * container does not exist the app can be assumed to be uninstalled. This
 * allows app states and events/triggers to reach another process. For example
 * if the cli starts an app, the gui can receive a start event from this token
 * container. Another benefit is the container actions for the token take place
 * after all other containers in an app are done being acted upon.
 */
module.exports = function(kbox) {

  // Node modules.
  var path = require('path');

  /*
   * Run whenever an app is loaded.
   */
  kbox.core.events.on('post-app-load', function(app) {

    // Get a compose object for the token container.
    var compose = {
      compose: [path.resolve(__dirname, '..', 'kalabox-compose.yml')],
      project: app.name,
      opts: {
        internal: true
      }
    };

    // Start token container.
    app.events.on('post-start', function() {
      return kbox.engine.start(compose);
    });

    // Stop token container.
    app.events.on('post-stop', function() {
      return kbox.engine.stop(compose);
    });

    // Destroy token container.
    app.events.on('post-destroy', function() {
      return kbox.engine.destroy(compose);
    });

  });

};
