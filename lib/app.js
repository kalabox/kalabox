/**
 * Module for interacting with and managing user defined apps.
 * @module kbox.app
 */

'use strict';

// Intrinsic modules.
var path = require('path');

// Npm modules.
var _ = require('lodash');
var VError = require('verror');

// Kbox modules.
var Promise = require('./promise.js');
var core = require('./core.js');
var engine = require('./engine.js');
var util = require('./util.js');
var disco = require('./app/discovery.js');
var kbox = require('./kbox.js');
var rmdir = require('rimraf');

/*
 * Some promisified globals.
 */
var fs = Promise.promisifyAll(require('fs'));
var services = require('./services.js');

/*
 * Pretty print an object.
 */
var pp = function(obj) {
  return JSON.stringify(obj, null, '  ');
};

/*
 * Create an app component from an app component spec.
 */
var createComponent = function(app, name, compose) {

  /*
   * Helper to replace image
   */
  var replaceImgVersion = function(image) {
    var split = image.split(':');
    if (split[1] === '$KALABOX_IMG_VERSION') {
      var tag = core.deps.get('globalConfig').imgVersion;
      return [split[0], tag].join(':');
    }
  };

  // Init component with component spec.
  var component = _.extend({}, compose);

  // The build image object
  var image = {};

  // Construct our build options
  if (component.image || component.build) {

    // Set the image name if applicable
    if (component.image) {
      // Set the image name
      var img = component.image;
      delete component.image;
      image.name = replaceImgVersion(img);

      // Check to see if we have a dockerfile for this image
      var imgDFile = path.join(app.root, 'dockerfiles', name, 'Dockerfile');
      if (fs.existsSync(imgDFile)) {
        image.src = imgDFile;
      }
    }
    else {
      image.name = name;
    }

    // Set the build stuff,
    // This will override the srcRoot above
    if (component.build) {
      image.build = true;
      var buildDFile = component.dockerfile || 'Dockerfile';
      if (fs.existsSync(path.resolve(app.root, component.build, buildDFile))) {
        image.src = path.resolve(component.build, buildDFile);
      }
    }
  }

  // Name.
  component.name = name;
  // Image/Build
  component.image = image;
  // Hostname
  component.hostname = [name, app.domain].join('.');
  // App domain.
  component.appDomain = app.domain;
  // Url.
  component.url = 'http://' + component.hostname;
  // Data container name.
  component.dataContainerName = app.dataContainerName;
  // Container name.
  component.containerName = ['kb', app.name, name].join('_');
  // Container ID.
  component.containerId = component.containerName;

  // Check to see if this component should be exposed
  if (app.config.expose[name]) {
    component.proxy = app.config.expose[name];
  }

  // Set our component config into the env
  var identifier = ['app', name].join('_');
  core.env.setEnvFromObj(component, identifier);

  // Return the component
  return component;

};

/*
 * Setup the app components for an app.
 */
var setupComponents = function(app) {

  // Load our core kalabox-compose.yml
  var compose = util.yaml.toJson(app.composeCore);

  // Load additional composefiles
  _.forEach(app.composeExtra, function(extra) {
    _.extend(compose, util.yaml.toJson(extra));
  });

  // Map config app components to app components.
  app.components = _.map(compose, function(component, name) {
    return createComponent(app, name, component);
  });

  // Update the config app components.
  app.config.appComponents = app.components;

};

/*
 * Load a plugin's apps.
 */
exports.loadPlugins = function(app, callback) {

  // Init plugins with plugin info from app config.
  if (!app.config.appPlugins) {
    app.plugins = [];
  } else {
    app.plugins = app.config.appPlugins;
  }

  // Map plugins with kbox require.
  return Promise.map(app.plugins, _.ary(kbox.require, 1))
  // Return.
  .nodeify(callback);

};

/**
 * Creates an app.
 * @static
 * @method
 * @arg {string} name - The name of the app.
 * @arg {object} config - An app config object.
 * @arg {function} callback - Callback function called when the app is created
 * @arg {error} callback.error - An error if any.
 * @arg {object} callback.app - The instantiated app object.
 * @prop {string} name - String name of the application.
 * @prop {string} domain - The domain name. -> appName.kbox
 * @prop {string} url - URL of the app.
 * @prop {string} dataContainerName - Name of the data component for the app.
 * @prop {string} appRoot - Root directory for the app.
 * @prop {object} config - The app's config object.
 * @prop {object<array>} plugins - List of the app's plugins.
 * @prop {object<array>} components - List of the app's components.
 * @example
 * kbox.app.create(config.appName, config, function(err, app) {
 *  callback(err, app);
 * });
 */
var create = exports.create = function(name, config, callback) {

  // Emit pre app create event.
  return core.events.emit('pre-app-create', config)
  // Get provider.
  .then(function() {
    return engine.provider();
  })
  // Create app.
  .then(function(provider) {
    // Init.
    var app = {};
    // Name.
    app.name = name;
    // Domain.
    app.domain = [name, config.domain].join('.');
    // Url.
    app.url = 'http://' + app.domain;
    // Data container name.
    app.dataContainerName = ['kb', app.name, 'data'].join('_');
    // Root.
    app.root = config.appRoot;
    // Root bind.
    app.rootBind = provider.path2Bind4U(app.root);
    // Config.
    app.config = config;
    // Config home bind.
    app.config.homeBind = provider.path2Bind4U(app.config.home);
    // Define core kalabox compose file
    app.composeCore = path.join(app.root, 'kalabox-compose.yml');
    // Define an extra compose array
    app.composeExtra = [];
    // Add an override file to compose extra if it exists
    var overrideFile = path.join(app.root, 'kalabox-compose-override.yml');
    if (fs.existsSync(overrideFile)) {
      app.composeExtra.push(overrideFile);
    }
    // Return what we have
    return app;
  })
  // Emit post event.
  .tap(function(app) {
    return core.events.emit('post-create-app', app);
  })
  // Setup components
  .tap(function(app) {
    return setupComponents(app);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Lists all the users apps known to Kalabox.
 * @static
 * @method
 * @arg {function} callback - Callback called when query for apps is complete.
 * @arg {error} callback.error
 * @arg {app<array>} callback.apps - Array of apps.
 * @example
 * kbox.app.list(function(err, apps) {
 *   if (err) {
 *     throw err;
 *   } else {
 *     apps.forEach(function(app) {
 *       console.log(app.name);
 *     });
 *   }
 * });
 */
var list = exports.list = function(callback) {

  // Get list of app names.
  return disco.list()
  // Map list of app names to list of apps.
  .then(function(appNames) {
    return Promise.map(appNames, function(appName) {
      return disco.getAppDir(appName)
      .then(function(dir) {
        var config = core.config.getAppConfig(appName, dir);
        return create(appName, config);
      });
    })
    .all();
  })
  // Validate list of apps, look for duplicates.
  .tap(function(apps) {
    // Group apps by app names.
    var groups = _.groupBy(apps, function(app) {
      return app.name;
    });
    // Find a set of duplicates.
    var duplicates = _.find(groups, function(group) {
      return group.length !== 1;
    });
    // If a set of duplicates were found throw an error.
    if (duplicates) {
      throw new Error('Duplicate app names exist: ' + pp(duplicates));
    }
  })
  // Return.
  .nodeify(callback);

};

/**
 * Get an app object from an app's name.
 * @static
 * @method
 * @arg {string} appName - App name for the app you want to get.
 * @arg {function} callback - Callback function called when the app is got.
 * @arg {error} callback.error - Error from getting the app.
 * @arg {app} callback.app - App object.
 * @example
 * kbox.app.get('myapp', function(err, app) {
 *   if (err) {
 *     throw err;
 *   } else {
 *     console.log(app.config);
 *   }
 * });
 */
exports.get = function(appName, callback) {

  // Get list of apps.
  return list()
  // Find an app that matches the given app name.
  .then(function(apps) {
    var app = _.find(apps, function(app) {
      return app.name === appName;
    });
    if (!app) {
      throw new Error('App "' + appName + '" does not exist.');
    }
    return app;
  })
  // Return.
  .nodeify(callback);

};

/*
 * Get a list of an app's components.
 */
var getComponents = function(app) {
  // Get list of components.
  var components = _.toArray(app.components);
  // Remove data component.
  return components;
};

/*
 * Returns true if any of the app's containers are running.
 */
var isRunning = exports.isRunning = function(app, callback) {
  return engine.listContainers(app.name)
  .reduce(function(acc, container) {
    return acc || engine.isRunning(container.id);
  }, false)
  .nodeify(callback);
};

/*
 * Returns true if any of the app's containers are installed.
 */
exports.isInstalled = function(app, callback) {
  return engine.listContainers(app.name)
  .then(function(containers) {
    return !!containers.length;
  })
  .nodeify(callback);
};

/*
 * Uninstall a component.
 */
var uninstallComponent = function(component, callback) {

  // Emit pre event.
  return core.events.emit('pre-uninstall-component', component)
  // Uninstall container.
  .then(function() {
    return engine.remove(component.containerName);
  })
  // Remove the container id file.
  .then(function() {
    return fs.unlinkAsync(component.containerIdFile)
    // Ignore ENOENT errors (file doesn't exist).
    .catch(function(err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    });
  })
  // Emit post event.
  .then(function() {
    return core.events.emit('post-uninstall-component', component);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Uninstalls an app's components except for the data container.
 * @static
 * @method
 * @arg {object} app - App object you want to uninstall.
 * @arg {function} callback - Callback called when the app has been uninstalled.
 * @arg {array} callback.errors - Array of errors from uninstalling components.
 * @example
 * kbox.app.uninstall(app, function(err) {
 *   if (err) {
 *     throw err;
 *   } else {
 *     console.log('App uninstalled.');
 *   }
 * });
 */
var uninstall = exports.uninstall = function(app, callback) {

  // Report to metrics.
  return Promise.try(function() {
    return kbox.metrics.reportAction('uninstall');
  })
  // Emit pre event.
  .then(function() {
    return core.events.emit('pre-uninstall', app);
  })
  // Stop components.
  .then(function() {
    return Promise.resolve(getComponents(app))
    // Filter out components that don't exist.
    .filter(function(component) {
      return engine.containerExists(component.containerName);
    })
    .map(_.ary(uninstallComponent, 1), {concurrency: 1})
    .all();
  })
  // Emit post event.
  .then(function() {
    return core.events.emit('post-uninstall', app);
  })
  // Return.
  .nodeify(callback);

};

/*
 * Returns an array of orphaned container components
 */
var getOrphanedContainers = function(appName) {

  // Get CID directory
  var cidDir = path.join(core.deps.get('globalConfig').sysConfRoot, 'appcids');

  // Get cid files for the given appName
  return Promise.filter(fs.readdirSync(cidDir), function(cid) {
    return _.includes(cid, appName);
  })

  // Return array of orphaned components for this app
  .map(function(container) {
    return {
      containerName: container,
      containerIdFile: path.join(cidDir, container),
      containerId: fs.readFileSync(path.join(cidDir, container), 'utf8')
    };
  });
};

/**
 * Attempts to clean up corrupted apps. This will compare the appRegistry
 * with kbox.list to determine apps that may have orphaned containers. If
 * those apps do have orphaned containers then we remove those containers
 * and finally the corrupted app from the appRegisty.
 * @static
 * @method
 * @arg {function} callback - Callback called when the app has been rebuilt.
 * @arg {array} callback.errors - Error from cleaning app.
 * @example
 * kbox.app.clean(function(errs) {
 *   if (err) {
 *     throw err;
 *   } else {
 *     console.log('PURIFICATION COMPLETE!');
 *   }
 * });
 */
var cleanup = exports.cleanup = function(callback) {

  /*
   * Get appnames from appRegistry
   */
  var appNamesFromAppReg = function() {
    return Promise.map(disco.getDirsAppRegistry(), function(appDir) {
      return _.last(appDir.split(path.sep));
    });
  };

  /*
   * Get appnames from kbox.app.list
   */
  var appNamesFromAppList = function() {
    return Promise.map(list(), function(app) {
      return app.name;
    });
  };

  core.log.debug('APP CLEANUP => STARTING');

  // Grab apps from the app registry and also from kbox.app.list so
  // we can compare them
  return Promise.all([
    appNamesFromAppReg(),
    appNamesFromAppList()
  ])

  // Determine what apps might be orphaned
  .spread(function(a, b) {
    return _.difference(a, b);
  })

  // Do the cleanup on each app
  .each(function(appName) {

    // See if our app has orphaned containers
    return getOrphanedContainers(appName)

    // If it does do the cleanup
    .each(function(component) {

      core.log.debug('WARNING! ORPHANED CONTAINER DETECTED => REMOVING...');

      // Check if our container actually exists, we might have a stale cidfile
      return engine.containerExists(component.containerId)

      // If it exists remove the container, if it doesnt just
      // delete the stale cidfile
      .then(function(exists) {
        if (exists) {
          // Check if container is running
          return engine.isRunning(component.containerId)
          // Stop the container if it is running
          .then(function(isRunning) {
            if (isRunning) {
              return engine.stop(component.containerId);
            }
          })
          // Uninstall the orphaned component
          .then(function() {
            return uninstallComponent(component);
          });
        }
        else {
          return fs.unlinkAsync(component.containerIdFile);
        }
      });
    })

    // Get the appRegistry
    .then(function() {
      return disco.getDirsAppRegistry();
    })

    // Filter out the correct dir for this app
    .filter(function(dir) {
      return _.last(dir.split(path.sep)) === appName;
    })

    // Remove the directory from teh appRegistry
    .then(function(dir) {
      return disco.removeAppDir(dir[0]);
    });
  })

  // Inform the user
  .then(function() {
    core.log.debug('APP CLEANUP => COMPLETE');
  })

  // Return.
  .nodeify(callback);

};

/**
 * Installs an app's components.
 * @static
 * @method
 * @arg {object} app - App object you want to install.
 * @arg {function} callback - Callback called when the app has been installed.
 * @arg {array} callback.errors - Array of errors from installing components.
 * @example
 * kbox.app.install(app, function(errs) {
 *   if (errs) {
 *     throw errs;
 *   } else {
 *     console.log('App installed.');
 *   }
 * });
 */
var install = exports.install = function(app, callback)  {

  // Report to metrics.
  return kbox.metrics.reportAction('install')
  // Make sure we are in a clean place before we get dirty
  .then(function() {
    return cleanup();
  })
  // Emit pre event.
  .then(function() {
    return core.events.emit('pre-app-install', app);
  })
  // Add app to app registry.
  .then(function() {
    return Promise.retry(function() {
      return disco.registerAppDir(app.config.appRoot);
    });
  })
  // Install components.
  .then(function() {
    // Get components we need to install
    var installComponents = _.map(getComponents(app), function(component) {
      return component.image;
    });
    return engine.build(installComponents);
  })
  // Emit post event.
  .then(function() {
    return core.events.emit('post-app-install', app);
  })
  // Wrap errors.
  .catch(function(err) {
    throw new VError(err, 'Error while installing app: ' + pp(app.name));
  })
  // Return.
  .nodeify(callback);

};

/**
 * Starts an app's components.
 * @static
 * @method
 * @arg {object} app - App object you want to start.
 * @arg {function} callback - Callback called when the app has been started.
 * @arg {array} callback.errors - Array of errors from starting components.
 * @example
 * kbox.app.start(app, function(errs) {
 *   if (errs) {
 *     throw errs;
 *   } else {
 *     console.log('App started.');
 *   }
 * });
 */
var start = exports.start = function(app, callback) {

  // Verify services are in a good state.
  return services.verify()
  // Report to metrics.
  .then(function() {
    return kbox.metrics.reportAction('start');
  })
  // Make sure we are in a clean place before we get dirty
  .then(function() {
    return cleanup();
  })
  // Emit pre event.
  .then(function() {
    return core.events.emit('pre-app-start', app);
  })
  // Get apps kalabox compose files
  .then(function() {
    return [app.composeCore].concat(app.composeExtra);
  })
  // Start components
  .then(function(startComponents) {
    return engine.start({compose: startComponents});
  })
  // Emit post event.
  .then(function() {
    return core.events.emit('post-app-start', app);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Stops an app's components
 * any other apps running.
 * @static
 * @method
 * @arg {object} app - App object you want to stop.
 * @arg {function} callback - Callback called when the app has been stopped.
 * @arg {array} callback.errors - Array of errors from stopping components.
 * @example
 * kbox.app.stop(app, function(errs) {
 *   if (errs) {
 *     throw errs;
 *   } else {
 *     console.log('App stopped.');
 *   }
 * });
 */
var stop = exports.stop = function(app, callback) {

  // Verify services are in a good state.
  return services.verify()
  // Report to metrics.
  .then(function() {
    return kbox.metrics.reportAction('stop');
  })
  // Make sure we are in a clean place before we get dirty
  .then(function() {
    return cleanup();
  })
  // Emit pre event.
  .then(function() {
    return core.events.emit('pre-app-stop', app);
  })
  // Get apps kalabox compose files
  .then(function() {
    return [app.composeCore].concat(app.composeExtra);
  })
  // Stop components.
  .then(function(stopComponents) {
    return engine.stop({compose: stopComponents});
  })
  // Emit post event.
  .then(function() {
    return core.events.emit('post-app-stop', app);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Stops and then starts an app's components.
 * @static
 * @method
 * @arg {object} app - App object you want to restart.
 * @arg {function} callback - Callback called when the app has been restarted.
 * @arg {array} callback.errors - Array of errors from restarting components.
 * @example
 * kbox.app.restart(app, function(errs) {
 *   if (errs) {
 *     throw errs;
 *   } else {
 *     console.log('App Restarted.');
 *   }
 * });
 */
exports.restart = function(app, callback) {

  // Stop app.
  return stop(app)
  // Start app.
  .then(function() {
    return start(app);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Uninstalls an app's components including the data container, and removes
 * the app's code directory.
 * @static
 * @method
 * @arg {object} app - App object you want to uninstall.
 * @arg {function} callback - Callback called when the app has been uninstalled.
 * @arg {array} callback.errors - Array of errors from uninstalling components.
 * @example
 * kbox.app.destroy(app, function(err) {
 *   if (err) {
 *     throw err;
 *   } else {
 *     console.log('App destroyed.');
 *   }
 * });
 */
exports.destroy = function(app, callback) {

  // Report to metrics.
  return Promise.try(function() {
    return kbox.metrics.reportAction('destroy');
  })
  // Emit pre event.
  .then(function() {
    return core.events.emit('pre-destroy', app);
  })
  // Make sure app is stopped.
  .then(function() {
    return isRunning(app)
    .then(function(isRunning) {
      if (isRunning) {
        return stop(app);
      }
    });
  })
  // Remove the data container.
  .then(function() {
    var dataName = ['kb', app.name, 'data'].join('_');
    var dataContainerIdFile = path.join(app.config.appCidsRoot, dataName);
    // Try to read file.
    return Promise.fromNode(function(cb) {
      fs.readFile(dataContainerIdFile, 'utf8', cb);
    })
    // Return null if file doesn't exist.
    .catch(function(err) {
      if (err.code === 'ENOENT') {
        return null;
      } else {
        throw err;
      }
    })
    // If the container id was read successfully, remove the container.
    .then(function(containerId) {
      if (containerId) {
        return Promise.fromNode(function(cb) {
          fs.unlink(dataContainerIdFile, cb);
        })
        .then(function() {
          return engine.remove(containerId);
        });
      }
    });
  })
  // Uninstall app.
  .then(function() {
    return uninstall(app);
  })
  // Remove the app directory.
  .then(function() {
    return Promise.fromNode(function(cb) {
      rmdir(app.root, cb);
    });
  })
  // Remove from appRegistry
  .then(function() {
    return disco.removeAppDir(app.root);
  })
  // Emit post event.
  .then(function() {
    return core.events.emit('post-destroy', app);
  })
  // DESTRUCTION COMPLETE
  .then(function() {
    console.log(kbox.art.postDestroy());
  })
  // Return.
  .nodeify(callback);

};

/**
 * Rebuilds an apps containers. This will stop an app's containers, remove all
 * of them except the data container, pull down the latest versions of the
 * containers as specified in the app's kalabox.json. You will need to run
 * `kbox start` when done to restart your app.
 * @static
 * @method
 * @arg {object} app - App object you want to rebuild.
 * @arg {function} callback - Callback called when the app has been rebuilt.
 * @arg {array} callback.errors - Error from rebuilding components.
 * @example
 * kbox.app.rebuild(app, function(errs) {
 *   if (err) {
 *     throw err;
 *   } else {
 *     console.log('App rebuilt!.');
 *   }
 * });
 */
exports.rebuild = function(app, callback) {

  // Stop app.
  return stop(app)
  // Uninstall app.
  .then(function() {
    return uninstall(app);
  })
  // Install app.
  .then(function() {
    return install(app);
  })
  // Return.
  .nodeify(callback);

};
