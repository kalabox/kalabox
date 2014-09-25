var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var vasync = require('vasync');

var App = require('./app');
//var Component = require('./app');
var cmp = require('./component.js');

var kconfig = require('./config.js');

var Docker = require('dockerode');
var docker =  new Docker(kconfig.docker);

/**
 * Reads app dir and sets status for each app.
 *
 * Status:
 *  - uninstalled: Config exists, but no containers
 *  - off: Config & containers exist, but containers are off
 *  - on: Config & containers exist and containers are on
 */
var getApps = function(callback) {
  var dirs = fs.readdirSync(path.resolve(kconfig.appDataPath));
  var apps = {};
  for (var x in dirs) {
    var appDetail = require(path.resolve(kconfig.appDataPath, dirs[x], 'app.json'));
    apps[appDetail.name] = appDetail;
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
var registerTask = function(app, cmd, task) {
  app.tasks[cmd] = task;
};

/**
 * Initialize the app by creating & starting the Docker containers.
 */
var init = function(app) {
  // TODO: Validate if <appname>_ containers exist already
  app.emit('pre-init');
  var components = _.toArray(_.cloneDeep(app.components));
  vasync.forEachPipeline({
    'func': cmp.create,
    'inputs': components
  }, function(err, results) {
    app.emit('post-init');
  });
};

/**
 * Start all app containers.
 */
var start = function(app) {
  app.emit('pre-start');
  var components = _.toArray(_.cloneDeep(app.components));
  vasync.forEachPipeline({
    'func': cmp.start,
    'inputs': components
  }, function(err, results) {
    app.emit('post-start');
  });
};

/**
 * Stop all app containers.
 */
var stop = function(app) {
  app.emit('pre-stop');
  var components = _.toArray(_.cloneDeep(app.components));
  vasync.forEachPipeline({
    'func': cmp.stop,
    'inputs': components
  }, function(err, results) {
    app.emit('post-stop');
  });
};

/**
 * Kill all app containers.
 */
var kill = function(app) {
  app.emit('pre-kill');
  var components = _.toArray(_.cloneDeep(app.components));
  vasync.forEachPipeline({
    'func': cmp.kill,
    'inputs': components
  }, function(err, container) {
    app.emit('post-kill');
  });
};

/**
 * Remove all app containers.
 */
var remove = function(app) {
  app.emit('pre-remove');
  var components = _.toArray(_.cloneDeep(app.components));
  vasync.forEachPipeline({
    'func': cmp.remove,
    'inputs': components
  }, function(err, results) {
    app.emit('post-remove');
  });
};

/**
 * Pull all component images.
 */
var pull = function(app) {
  app.emit('pre-pull');
  var components = _.filter(app.components, function(component) { return !component.image.build });
  var images = _.pluck(components, 'image');
  vasync.forEachPipeline({
    'func': image.pull,
    'inputs': images
  }, function(err, results) {
    app.emit('post-pull');
  });
};

/**
 * Build all component images.
 */
var build = function(app) {
  app.emit('pre-build');
  var components = _.filter(app.components, function(component) { return component.image.build === true});
  var images = _.pluck(components, 'image');

  vasync.forEachPipeline({
    'func': image.build,
    'inputs': images
  }, function(err, results) {
    app.emit('post-build');
  });
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


module.exports = {
  App: App,
  docker: docker,
  kconfig: kconfig,
  getApps: getApps,
  registerTask: registerTask,
  init: init,
  start: start,
  stop: stop,
  kill: kill,
  remove: remove,
  pull: pull,
  build: build
};
