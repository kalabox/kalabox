'use strict';

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
