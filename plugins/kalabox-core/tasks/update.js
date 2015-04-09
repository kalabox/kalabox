'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var util = require('./../util.js')(kbox);

  // @todo: scaffolding is in place for a kbox update command for apps
  /*
  kbox.whenApp(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'update'];
      task.description = 'Update an app and it\'s dependencies.';
      task.func = util.createFrameworkFunc(task, kbox.update);
    });
  });
  */

};
