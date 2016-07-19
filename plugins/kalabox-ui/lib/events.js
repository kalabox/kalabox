'use strict';

module.exports = function(kbox) {

  /*
   * Run whenever an app is loaded.
   */
  kbox.core.events.on('post-app-load', function(app) {

    // Start an app.
    app.events.on('post-start', function() {
      return kbox.core.events.emit('app-started', app);
    });

    // Stop an app.
    app.events.on('post-stop', function() {
      return kbox.core.events.emit('app-stopped', app);
    });

    // Create an app.
    app.events.on('post-create', 9, function() {
      return kbox.core.events.emit('app-created', app);
    });

    // Destroy an app.
    app.events.on('post-destroy', function() {
      return kbox.core.events.emit('app-destroyed', app);
    });

  });

};
