var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var Docker = require('dockerode');
var config = require('../config.json');
var App = require('./app');

/**
 * Reads app dir and sets status for each app.
 *
 * Status:
 *  - uninstalled: Config exists, but no containers
 *  - off: Config & containers exist, but containers are off
 *  - on: Config & containers exist and containers are on
 */
var getApps = function() {
  var dirs = fs.readdirSync(path.resolve(config.appDir));
  var apps = [];
  for (var x in dirs) {
    apps.push(new App(dirs[x]));
  }
  return apps;
  /*
  docker.listContainers(function (err, containers) {
    containers.forEach(function (containerInfo) {
      docker.getContainer(containerInfo.Id).stop(cb);
    });
  });
  */
};

module.exports = {
  App: App,
  getApps: getApps
};
