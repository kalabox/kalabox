/**
 * Module for interacting with and managing user defined apps.
 * @module kbox.app
 */

'use strict';

var fs = require('fs');
var path = require('path');
var core = require('./core.js');
var engine = require('./engine.js');
var services = require('./services.js');
var util = require('./util.js');
var helpers = util.helpers;
var _ = require('lodash');

var createComponent = function(app, name, componentSpec) {
  var component = {};
  for (var key in componentSpec) {
    component[key] = componentSpec[key];
  }
  component.name = name;
  component.hostname = [name, app.domain].join('.');
  component.url = 'http://' + component.hostname;
  component.dataContainerName = app.dataContainerName;
  component.containerName = ['kb', app.name, name].join('_');
  component.containerIdFile = path.join(app.config.appCidsRoot, name);
  component.containerId = null;

  if (fs.existsSync(component.containerIdFile)) {
    component.containerId = fs.readFileSync(component.containerIdFile, 'utf8');
  }

  if (component.image.build) {
    var pathsToSearch = [
      app.config.appRoot,
      app.config.srcRoot
    ].map(function(dir) {
      return path.join(dir, component.image.src, 'Dockerfile');
    });
    var rootPath = util.searchForPath(pathsToSearch);
    if (rootPath === null) {
      component.image.build = false;
    } else {
      component.image.src = rootPath;
    }
  }
  return component;
};

var setupComponents = function(app) {
  app.components = app.config.appComponents;
  if (!fs.existsSync(app.config.appCidsRoot))  {
    fs.mkdirSync(app.config.appCidsRoot);
  }
  for (var key in app.components) {
    var componentSpec = app.components[key];
    app.components[key] = createComponent(app, key, componentSpec);
    if (key === 'data') {
      app.dataContainerName = ['kb', app.name, 'data'].join('_');
    }
  }
};

var loadPlugins = function(app) {
  if (app.config.appPlugins !== undefined) {
    app.plugins = app.config.appPlugins;
  } else {
    app.plugins = [];
  }
  var pluginDirs = [
    app.config.appRoot,
    app.config.srcRoot,
    app.config.kalaboxRoot
  ];
  var overrides = {
    app: app,
    appConfig: app.config
  };
  core.deps.override(overrides, function(done) {
    app.plugins.forEach(function(pluginName) {
      var plugin = core.plugin.load(pluginName, pluginDirs);
      if (plugin !== null) {
        app.plugins[pluginName] = plugin;
      }
    });
    app.config.globalPlugins.forEach(function(pluginName) {
      var plugin = core.plugin.loadIfUsesApp(pluginName, pluginDirs);
      if (plugin !== null) {
        app.plugins[pluginName] = plugin;
      }
    });
    done();
  });
};

var create = function(name, config) {
  var app = {};
  app.name = name;
  app.domain = [name, config.domain].join('.');
  app.url = 'http://' + app.domain;
  app.dataContainerName = null;
  app.root = config.appRoot;
  app.config = config;
  setupComponents(app);
  loadPlugins(app);
  return app;
};

var list = function(callback) {
  core.deps.call(function(globalConfig) {
    var root = globalConfig.appsRoot;
    if (fs.existsSync(root)) {
      fs.readdir(root, function(err, filenames) {
        if (err) {
          callback(err);
        } else {
          var results = helpers.filterMap2(filenames, function(filename) {
            var filepath = path.join(root, filename, core.config.CONFIG_FILENAME);
            if (fs.existsSync(filepath)) {
              var name = filename;
              var config = core.config.getAppConfig(name);
              return create(name, config);
            } else {
              return null;
            }
          });
          callback(err, results);
        }
      });
    } else {
      // The root directory does not exist.
      callback(null, []);
    }
  });
};
exports.list = list;

/**
 * Get an app object from an app's name.
 * @arg {string} appName - App name for the app you want to get.
 * @arg {function} callback - Callback function called when the app is got.
 * @arg {error} callback.error - Error from getting the app.
 * @arg {object} callback.app - App object.
 */
var get = function(appName, callback) {
  list(function(err, apps) {
    if (err) {
      callback(err);
    } else {
      var app = helpers.find(apps, function(app) { return app.name === appName; });
      if (app === null) {
        callback(new Error('App [' + appName + '] does not exist.'));
      } else {
        callback(null, app);
      }
    }
  });
};
exports.get = get;

var getComponents = function(app) {
  return _.toArray(app.components);
};

var getInstallOptions = function(app, component) {
  var opts = {
    Hostname: component.hostname,
    name: component.containerName,
    Image: component.image.name,
    Dns: ['8.8.8.8', '8.8.4.4'],
    Env: ['APPNAME=' + app.name, 'APPDOMAIN=' + app.domain]
  };
  if (component.dataContainerName !== null) {
    opts.HostConfig = {VolumesFrom:[component.dataContainerName]};
  }
  if (component.installOptions) {
    for (var key in component.installOptions) {
      opts[key] = component.installOptions[key];
    }
  }
  return opts;
};

var installComponent = function(events, app, component, callback) {
  events.emit('pre-install-component', component, function() {
    engine.build(component.image, function(err) {
      if (err) {
        callback(err);
      } else {
        var installOptions = getInstallOptions(app, component);
        // @todo: debug remove
        console.log('installOptions: ' + JSON.stringify(installOptions));
        engine.create(installOptions, function(err, container) {
          if (err) {
            callback(err);
          } else {
            if (container) {
              component.containerId = container.cid;
              fs.writeFileSync(path.resolve(component.containerIdFile), container.cid);
            }
            events.emit('post-install-component', component, function() {
              callback(err);
            });
          }
        });
      }
    });
  });
};

/**
 * Installs an app's components.
 * @arg {object} app - App object you want to install.
 * @arg {function} callback - Callback called when the app has been installed.
 * @arg {array} callback.errors - Array of errors from installing components.
 */
exports.install = function(app, callback) {
  core.deps.call(function(events) {
    events.emit('pre-install', app, function() {
      helpers.mapAsync(
        getComponents(app),
        function(component, done) {
          installComponent(events, app, component, done);
        },
        function(errs) {
          events.emit('post-install', app, function() {
            callback(errs);
          });
        }
      );
    });
  });
};

var getStartOptions = function(app, component, opts) {
  var startOpts = {
    Hostname: component.hostname,
    PublishAllPorts: true,
    Binds: [
      app.root + ':/src:rw',
      '/kalabox/code/' + app.name + ':/data/code:rw'
    ],
    Env: ['APPNAME=' + app.name, 'APPDOMAIN=' + app.domain]
  };
  if (opts) {
    for (var key in opts) {
      startOpts[key] = opts[key];
    }
  }
  return startOpts;
};

var startComponent = function(events, app, component, callback) {
  var opts = getStartOptions(app, component);
  events.emit('pre-start-component', component, function() {
    engine.start(component.containerId, opts, function(err) {
      events.emit('post-start-component', component, function() {
        callback(err);
      });
    });
  });
};

/**
 * Starts an app's components.
 * @arg {object} app - App object you want to start.
 * @arg {function} callback - Callback called when the app has been started.
 * @arg {array} callback.errors - Array of errors from starting components.
 */
var start = function(app, callback) {
  core.deps.call(function(events) {
    services.verify(function(err) {
      if (err) {
        callback(err);
      } else {
        events.emit('pre-start', app, function() {
          helpers.mapAsync(
            getComponents(app),
            function(component, done) {
              startComponent(events, app, component, done);
            },
            function(errs) {
              events.emit('post-start', app, function() {
                callback(errs);
              });
            }
          );
        });
      }
    });
  });
};
exports.start = start;

var stopComponent = function(events, component, callback) {
  events.emit('pre-stop-component', function() {
    engine.stop(component.containerId, function(err) {
      events.emit('post-stop-component', component, function() {
        callback(err);
      });
    });
  });
};

/**
 * Stops an app's components.
 * @arg {object} app - App object you want to stop.
 * @arg {function} callback - Callback called when the app has been stopped.
 * @arg {array} callback.errors - Array of errors from stopping components.
 */
var stop = function(app, callback) {
  core.deps.call(function(events) {
    services.verify(function(err) {
      if (err) {
        callback(err);
      }
      else {
        events.emit('pre-stop', app, function() {
          helpers.mapAsync(
            getComponents(app),
            function(component, done) {
              stopComponent(events, component, done);
            },
            function(errs) {
              events.emit('post-stop', app, function() {
                callback(errs);
              });
            }
          );
        });
      }
    });
  });
};
exports.stop = stop;

/**
 * Stops and then starts an app's components.
 * @arg {object} app - App object you want to restart.
 * @arg {function} callback - Callback called when the app has been restarted.
 * @arg {array} callback.errors - Array of errors from restarting components.
 */
exports.restart = function(app, callback) {
  stop(app, function(err) {
    if (err) {
      callback(err);
    } else {
      start(app, callback);
    }
  });
};

var uninstallComponent = function(events, component, callback) {
  events.emit('pre-uninstall-component', component, function() {
    engine.remove(component.containerId, function(err) {
      if (!err) {
        fs.unlinkSync(component.containerIdFile);
      }
      events.emit('post-uninstall-component', component, function() {
        callback(err);
      });
    });
  });
};

/**
 * Uninstalls an app's components.
 * @arg {object} app - App object you want to uninstall.
 * @arg {function} callback - Callback called when the app has been uninstalled.
 * @arg {array} callback.errors - Array of errors from uninstalling components.
 */
exports.uninstall = function(app, callback) {
  core.deps.call(function(events) {
    events.emit('pre-uninstall', app, function() {
      helpers.mapAsync(
        getComponents(app),
        function(component, done) {
          uninstallComponent(events, component, done);
        },
        function(errs) {
          events.emit('post-uninstall', app, function() {
            callback(errs);
          });
        });
    });
  });
};
