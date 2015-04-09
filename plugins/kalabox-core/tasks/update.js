'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var util = require('./../util.js')(kbox);

  kbox.whenApp(function(app) {
    kbox.tasks.add(function(task) {
      console.log('COMING SOON!');
      task.path = [app.name, 'update'];
      task.description = 'Update app and it\'s dependencies.';
      task.func = util.createFrameworkFunc(task, kbox.update);
    });
  });

};
