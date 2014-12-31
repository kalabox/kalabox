'use strict';

var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var async = require('async');
var vasync = require('vasync');

var image = require('./image.js');
var cmp = require('./component.js');
var ctn = require('./container.js');

var kconfig = require('./config.js');

var Docker = require('dockerode');
var docker =  new Docker(kconfig.docker);

var core = require('./core.js');
var util = require('./util.js');
var b2d = require('./b2d.js');

var MANAGER_DEP_NAME = 'manager';
var DOCKER_DEP_NAME = 'docker';
var SHELL_DEP_NAME = 'shell';
var B2D_DEP_NAME = 'b2d';

if (!core.deps.contains(DOCKER_DEP_NAME)) {
  core.deps.register(DOCKER_DEP_NAME, docker);
}
if (!core.deps.contains(SHELL_DEP_NAME)) {
  core.deps.register(SHELL_DEP_NAME, util.shell);
}
if (!core.deps.contains(B2D_DEP_NAME)) {
  core.deps.register(B2D_DEP_NAME, b2d);
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
  var fn = function(callback) {
    var task = new core.Task(description, cmd, timeout);
    task.run(callback);
  };
  tasks[description] = fn;
};

var forEachContinue = function(arr, toKey, callback, done) {
  var rec = function(arr, errs) {
    if (arr.length === 0) {
      if (errs.length === 0) {
        done(null);
      } else {
        done(errs);
      }
    } else {
      var hd = arr[0];
      var tl = arr.slice(1);
      callback(hd, function(err, data) {
        if (err !== null) {
          err.message = '[' + toKey(hd) + '] ' + err.message;
          errs.push(err);
        }
        return rec(tl, errs);
      });
    }
  };
  rec(arr, []);
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

/*
 * Grabs from default config and builds dockerode ready things
 */
var getStartupServices = function(startupConf) {
  var servicePrefix = core.deps.lookup('globalConfig').startupServicePrefix;
  var services = {};
  _.forEach(startupConf, function(service) {
    if (service.createOpts) {
      var createName = servicePrefix + service.createOpts.name;
      services[createName] = {
        createOpts : service.createOpts,
        startOpts : service.startOpts
      };
      services[createName].createOpts.Image = service.name;
      services[createName].createOpts.name = createName;
    }
    if (service.containers) {
      services = _.merge(services, getStartupServices(service.containers));
    }
  });
  return services;
};

var createStartupServices = function(services, done) {
  vasync.forEachPipeline({
    'func': ctn.createGen,
    'inputs': _.toArray(services)
  }, function(err, results) {
    if (done) {
      done(err, results);
    }
  });
};

var startStartupServices = function(services, done) {
  vasync.forEachPipeline({
    'func': ctn.startGen,
    'inputs': _.toArray(services)
  }, function(err, results) {
    if (done) {
      done(err, results);
    }
  });
};

/**
 * List all containers
 */
var list = function(opts, done) {
  if (!opts) {
    opts = {all: 1};
  }
  docker.listContainers(opts, function(err, containers) {
    done(err, containers);
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

var start = function(app, done) {
  // @todo: had to put all this crap here because our
  // plugins .on events are run async. hopefully we can fix this
  // and dogfood our plugins system.
  var services = getStartupServices(core.deps.lookup('globalConfig').startupServices);
  var filters = {
    name: [core.deps.lookup('globalConfig').startupServicePrefix]
  };
  var opts = {
    all : 1,
    filters : JSON.stringify(filters)
  };
  var servicesNotCreated = _.clone(services);

  list(opts, function(err, containers) {
    if (err) {
      throw err;
    }

    _.forEach(containers, function(container) {
      var containerName = container.Names[0];
      if (containerName.charAt(0) === '/') {
        containerName = containerName.slice(1);
      }
      services[containerName].cid = container.Id;
      delete servicesNotCreated[containerName];
    });

    async.series([

      function(next) {
        if (!_.isEmpty(servicesNotCreated)) {
          var createServices = _.pluck(servicesNotCreated, 'createOpts');
          createStartupServices(createServices, function(err, results) {
            if (err) {
              throw err;
            }
            _.forEach(results.successes, function(container) {
              services[container.name].cid = container.id;
            });
            next(null);
          });
        }
        else {
          next(null);
        }
      },

      function(next) {
        startStartupServices(services, function(err, results) {
          if (err) {
            // @todo this can break things so quiet for now
            //throw err
          }
          next(null);
        });
      },

    ], function(err, results) {
        if (err) {
          throw err;
        }
        app.emit('pre-start');
        var cmps = app.components;
        var keys = Object.keys(cmps);
        forEachContinue(keys,
          function(key) {
            return key;
          },
          function(key, next) {
            cmp.start(cmps[key], next);
          },
          function(errs) {
            app.emit('post-start');
            done(errs);
          });
      });
  });
};

/**
 * Start all app containers.
 */
/*var start_old = function(app, done) {
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
};*/

var stop = function(app, done) {
  app.emit('pre-stop');
  var cmps = app.components;
  var keys = Object.keys(cmps);
  forEachContinue(keys,
    function(key) {
      return key;
    },
    function(key, next) {
      cmp.stop(cmps[key], next);
    },
    function(errs) {
      app.emit('post-stop');
      done(errs);
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

var loadPlugins = function() {
  core.deps.call(function(globalConfig) {
    var pluginDirs = [
      globalConfig.srcRoot,
      globalConfig.kalaboxRoot
    ];
    globalConfig.globalPlugins.forEach(function(pluginName) {
      var plugin = core.plugin.loadIfDoesNotUseApp(pluginName, pluginDirs);
      if (plugin !== null) {
        plugins[pluginName] = plugin;
      }
    });
  });
};

var setup = function() {
  loadPlugins();
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
  list: list,
  getStartupServices: getStartupServices,
  createStartupServices: createStartupServices,
  startStartupServices: startStartupServices,
  purgeContainers: purgeContainers,
  setup: setup
};

module.exports = manager;
