var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var App = require('./app');
var Component = require('./app');

var baseDir = path.resolve(__dirname, '../');
var config = require('./config.js');

var Docker = require('dockerode');
var docker =  new Docker(config.docker);


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
exports.GetApps = function(callback) {
  var dirs = fs.readdirSync(path.resolve(config.appDataPath));
  var apps = {};
  for (var x in dirs) {
    var appDetail = require(path.resolve(config.appDataPath, dirs[x], 'app.json'));
    apps[appDetail.appname] = appDetail;
  }

  docker.listContainers(function (err, containers) {
    containers.forEach(function (containerInfo) {
      var name = containerInfo.Names[0].substring(1);
      var prefix = name.substring(0, 3);

      var arr = name.split('_');
      if (prefix == 'kb_') {
        apps[arr[1]].status = 'enabled';
      }
    });

    docker.listContainers({all: 1}, function (err, containers) {
      containers.forEach(function (containerInfo) {
        var name = containerInfo.Names[0].substring(1);
        var prefix = name.substring(0, 3);

        var arr = name.split('_');
        if (prefix == 'kb_' && !apps[arr[1]].status) {
          apps[arr[1]].status = 'disabled';
        }
      });

      _(apps).each(function(app, key) {
        if (!app.status) {
          app.status = 'uninstalled';
        }
      });

      callback(apps);
    });
  });


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
