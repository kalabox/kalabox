'use strict';

/*
 * Package module for the Kalabox 'Share Package'.
 */

var core = require('../core.js');
var events = core.events;
var share = require('../share.js');

exports.init = function() {
  // EVENT: pre-down
  events.on('pre-down', function(done) {
    // Get local sync instance
    share.getLocalSync()
    .then(function(localSync) {
      // Check if it's up
      return localSync.isUp()
      .then(function(isUp) {
        if (isUp) {
          // If it's up, then shut'er down.
          return localSync.shutdown();
        }
      });
    })
    .then(function() {
      done();
    })
    .catch(function(err) {
      done(err);
    });
  });
  // APP EVENT: pre-start
  events.on('post-start', function(app, done) {
    share.restart(done);
  });
  // APP EVENT: pre-stop
  events.on('post-stop', function(app, done) {
    share.restart(done);
  });
};
