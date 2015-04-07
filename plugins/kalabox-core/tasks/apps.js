'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var _ = require('lodash');

module.exports = function(kbox) {

  // Display list of apps.
  kbox.tasks.add(function(task) {
    task.path = ['apps'];
    task.description = 'Display list of apps.';
    task.func = function(done) {
      kbox.app.list(function(err, apps) {
        if (err) {
          done(err);
        } else {
          var appNames = _.map(apps, function(app) {
            return app.name;
          });
          appNames.sort();
          _.forEach(appNames, function(appName) {
            console.log(appName);
          });
          done();
        }
      });
    };
  });

};
