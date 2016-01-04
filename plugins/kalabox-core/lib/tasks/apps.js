'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var Promise = kbox.Promise;
  var util = require('../util.js')(kbox);

  // Display list of apps.
  kbox.tasks.add(function(task) {
    task.path = ['apps'];
    task.description = 'Display list of apps.';
    task.options.push({
      name: 'names',
      alias: 'n',
      description: 'Only display app names.'
    });
    task.func = function(done) {

      // Keep refernece for later.
      var self = this;

      // Get list of app names.
      util.getAppNames()
      // Map app names to an object.
      .then(function(appNames) {
        if (self.options.names) {
          // Just return app names.
          return appNames;
        } else {
          // Reduce app names to an object of app stats.
          return Promise.reduce(appNames, function(obj, appName) {
            return util.getAppStats(appName)
            .then(function(stats) {
              obj[appName] = stats;
              return obj;
            });
          }, {});
        }
      })
      // Output object.
      .then(function(result) {
        console.log(JSON.stringify(result, null, '  '));
      })
      // Return.
      .nodeify(done);

    };
  });

};
