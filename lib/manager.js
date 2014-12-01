'use strict';

var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var vasync = require('vasync');

var image = require('./image.js');
var cmp = require('./component.js');
var ctn = require('./container.js');

var kconfig = require('./config.js');

var Docker = require('dockerode');
var docker =  new Docker(kconfig.docker);

var Task = require('./task.js');
var deps = require('./deps.js');
var shell = require('./shell.js');
var b2d = require('./b2d.js');

var MANAGER_DEP_NAME = 'manager';
var DOCKER_DEP_NAME = 'docker';
var SHELL_DEP_NAME = 'shell';
var B2D_DEP_NAME = 'b2d';

if (!deps.contains(DOCKER_DEP_NAME)) {
  deps.register(DOCKER_DEP_NAME, docker);
}
if (!deps.contains(SHELL_DEP_NAME)) {
  deps.register(SHELL_DEP_NAME, shell);
}
if (!deps.contains(B2D_DEP_NAME)) {
  deps.register(B2D_DEP_NAME, b2d);
}

var plugins = {};
var tasks = {};

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
    var file = path.resolve(kconfig.appDataPath, dirs[x], 'app.json');
    if (fs.existsSync(file)) {
      var appDetail = require(file);
      apps[appDetail.name] = appDetail;
    }
  }

  docker.listContainers(function(err, containers) {
    containers.forEach(function(containerInfo) {
      var name = ctn.name.parse(containerInfo.Names[0]);
      if (name !== null && ctn.name.isUserDefined(name)) {
        apps[name.appName].status = 'enabled';
      }
    });

    docker.listContainers({all: 1}, function(err, containers) {
      containers.forEach(function(containerInfo) {
        var name = ctn.name.parse(containerInfo.Names[0]);
        if (name !== null && ctn.name.isUserDefined(name) && !apps[name.appName].status) {
          apps[name.appName].status = 'disabled';
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
 * Registers a task to an app or the manager
 */
var registerTask = function(description, cmd, timeout) {
  var fn = function() {
    var task = new Task(description, cmd, timeout);
    task.on('error', function(err) {
      throw err;
    });
    task.run();
  };
  tasks[description] = fn;
};

var appAlreadyExists = function(app, callback) {
  var exists = false;
  docker.listContainers({all: 1}, function(err, containers) {
    if (err || !containers) {
      callback(err, exists);
    } else {
      require('chai').assert(containers !== undefined);
      containers.forEach(function(containerInfo) {
        require('chai').assert(containerInfo !== undefined);
        if (!exists) {
          var name = ctn.name.parse(containerInfo.Names[0]);
          if (name !== null && name.appName === app.name) {
            exists = true;
          }
        }
      });
      callback(null, exists);
    }
  });
};

/**
 * Initialize the app by creating & starting the Docker containers.
 */
var init = function(app, done) {
  appAlreadyExists(app, function(err, alreadyExists) {
    if (err) {
      done(err);
    } else if (alreadyExists) {
      done(err);
    } else {
      app.emit('pre-init');
      var components = _.toArray(_.cloneDeep(app.components));
      vasync.forEachPipeline({
        'func': cmp.create,
        'inputs': components
      }, function(err, results) {
        app.emit('post-init');
        if (done) {
          done(err);
        }
      });
    }
  });
};

/**
 * Start all app containers.
 */
var start = function(app, done) {
  app.emit('pre-start');
  var components = _.toArray(_.cloneDeep(app.components));
  vasync.forEachPipeline({
    'func': cmp.start,
    'inputs': components
  }, function(err, results) {
    app.emit('post-start');
    if (done) {
      done(err);
    }
  });
};

/**
 * Stop all app containers.
 */
var stop = function(app, done) {
  app.emit('pre-stop');
  var components = _.toArray(_.cloneDeep(app.components));
  vasync.forEachPipeline({
    'func': cmp.stop,
    'inputs': components
  }, function(err, results) {
    app.emit('post-stop');
    if (done) {
      done();
    }
  });
};

/**
 * Kill all app containers.
 */
var kill = function(app, done) {
  app.emit('pre-kill');
  var components = _.toArray(_.cloneDeep(app.components));
  vasync.forEachPipeline({
    'func': cmp.kill,
    'inputs': components
  }, function(err, container) {
    app.emit('post-kill');
    if (done) {
      done(err);
    }
  });
};

/**
 * Remove all app containers.
 */
var remove = function(app, done) {
  app.emit('pre-remove');
  var components = _.toArray(_.cloneDeep(app.components));
  vasync.forEachPipeline({
    'func': cmp.remove,
    'inputs': components
  }, function(err, results) {
    app.emit('post-remove');
    if (done) {
      done(err);
    }
  });
};

/**
 * Pull all component images.
 */
var pull = function(app, done) {
  app.emit('pre-pull');
  var components = _.filter(app.components, function(component) { return !component.image.build; });
  var images = _.pluck(components, 'image');
  vasync.forEachPipeline({
    'func': image.pull,
    'inputs': images
  }, function(err, results) {
    app.emit('post-pull');
    if (done) {
      done(err);
    }
  });
};

/**
 * Build all component images.
 */
var build = function(app, done) {
  app.emit('pre-build');
  var components = _.filter(app.components, function(component) { return component.image.build === true; });
  var images = _.pluck(components, 'image');

  vasync.forEachPipeline({
    'func': image.build,
    'inputs': images
  }, function(err, results) {
    app.emit('post-build');
    if (done) {
      done(err);
    }
  });
};

/**
 * Remove all non-kalabox containers
 */
var purgeContainers = function(cbRemove, cbDone) {
  docker.listContainers({all: 1}, function(err, containers) {
    containers.forEach(function(containerInfo) {
      var name = ctn.name.parse(containerInfo.Names[0]);
      var shouldPurge = name === null || !ctn.name.isKalaboxName(name);
      if (shouldPurge) {
        docker.getContainer(containerInfo.Id).remove(function(err, data) {
          if (cbRemove) {
            cbRemove(containerInfo);
          }
        });
      }
    });
    if (cbDone) {
      cbDone();
    }
  });
};

/**
 * The manager object
 */
var manager = {
  plugins: plugins,
  tasks: tasks,
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
  build: build,
  purgeContainers: purgeContainers
};

if (!deps.contains(MANAGER_DEP_NAME)) {
  deps.register(MANAGER_DEP_NAME, manager);
}

// Load default global plugins
_.map(kconfig.plugins.global, function(plugin, key) {
  var src = path.resolve(kconfig.baseDir, 'plugins', key);
  // Pass in a mock object since manager isn't an object yet.
  plugins[key] = require(src)(plugin, manager);
});

module.exports = manager;
