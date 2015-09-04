'use strict';

var path = require('path');
var _ = require('lodash');

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var events = kbox.core.events;
  var deps = kbox.core.deps;

  kbox.whenAppRegistered(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'build'];
      task.category = 'dev';
      task.description = 'Try to manually install a custom kalabox app.';
      task.options.push({
        name: 'build-local',
        kind: 'boolean',
        description: 'Build from local sources instead of pulling remote images'
      });
      task.func = function(done) {
        kbox.app.install(app, done);
      };
    });
  });

};
