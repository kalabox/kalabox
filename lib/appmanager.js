var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var Docker = require('dockerode');
var config = require('../config.json');
var App = require('./app');
var Component = require('./app');

exports.App = App;
exports.Component = Component;

/**
 * Reads app dir and sets status for each app.
 *
 * Status:
 *  - uninstalled: Config exists, but no containers
 *  - off: Config & containers exist, but containers are off
 *  - on: Config & containers exist and containers are on
 */
exports.GetApps = function() {
  var dirs = fs.readdirSync(path.resolve(config.appDir));
  var apps = [];
  for (var x in dirs) {
    apps.push(new App(dirs[x]));
  }
  return apps;
};

/**
 * Registers a task to an app
 *
 * @param app app object
 * @param cmd kbox command
 * @param task callback
 */
exports.RegisterTask = function(app, cmd, task) {
  app.tasks[cmd] = task;
};

/*
module.exports = {
  App: App,
  getApps: getApps,
  registerTask: registerTask
};
*/

/*
util.inherits(App, EventEmitter);
module.exports = App;
*/
