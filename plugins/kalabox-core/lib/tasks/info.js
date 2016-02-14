'use strict';

/**
 * Basic task that prints out any info an app has declared
 */

module.exports = function(kbox) {

  kbox.whenAppRegistered(function(app) {

    kbox.tasks.add(function(task) {
      task.path = [app.name, 'info'];
      task.category = 'appAction';
      task.description = 'Get info about this app.';
      task.func = function() {
        var info = app.info || {};
        console.log(JSON.stringify(info, null, 2));
      };
    });
  });

};
