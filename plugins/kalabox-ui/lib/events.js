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

  /*
   * Run whenever an app is loaded.
   */
  kbox.core.events.on('post-app-load', function(app) {

    // Start token container.
    app.events.on('post-start', function() {
      return kbox.core.events.emit('app-started', app);
    });

    // Stop token container.
    app.events.on('post-stop', function() {
      return kbox.core.events.emit('app-stopped', app);
    });

    // Destroy token container.
    app.events.on('post-destroy', function() {
      return kbox.core.events.emit('app-destroyed');
    });

  });

};
