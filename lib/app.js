/**
 * Module for interacting with and managing user defined apps.
 * @module kbox.app
 */

'use strict';

// Intrinsic modules.
var assert = require('assert');
var path = require('path');

// Npm modules.
var _ = require('lodash');
var async = require('async');
var VError = require('verror');

// Kbox modules.
var Promise = require('./promise.js');
var core = require('./core.js');
var engine = require('./engine.js');
var util = require('./util.js');
var helpers = util.helpers;
var share = require('./share.js');
var disco = require('./app/discovery.js');
var kbox = require('./kbox.js');
var rmdir = require('rimraf');

/*
 * Some promisified globals.
 */
var fs = Promise.promisifyAll(require('fs'));
// @todo: bcauldwell - Services should support promises.
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
var createComponent = function(app, name, componentSpec) {

  // Init component with component spec.
  var component = _.extend({}, componentSpec);

  // Name.
  component.name = name;
  // Hostname.
  component.hostname = [name, app.domain].join('.');
  // App domain.
  component.appDomain = app.domain;
  // Url.
  component.url = 'http://' + component.hostname;
  // Data container name.
  component.dataContainerName = app.dataContainerName;
  // Container name.
  component.containerName = ['kb', app.name, name].join('_');
  // Container ID file.
  var cName = component.containerName;
  component.containerIdFile = path.join(app.config.appCidsRoot, cName);
  // Container ID.
  component.containerId = component.containerName;

  // @todo: bcauldwell - I think container ID files can be done away with, but
  // if we keep them we should probably not use fs.exists.
  if (fs.existsSync(component.containerIdFile)) {
    component.containerId = fs.readFileSync(component.containerIdFile, 'utf8');
  }

  // @todo: bcauldwell - @AUDIT
  if (component.image.build) {
    var pathsToSearch = [
      app.config.appRoot,
      app.config.srcRoot
    ].map(function(dir) {
      return path.join(dir, 'dockerfiles', component.image.name, 'Dockerfile');
    });
    var rootPath = util.searchForPath(pathsToSearch);
    if (!rootPath) {
      component.image.build = false;
    } else {
      component.image.srcRoot = rootPath;
    }
  }

  return component;

};

/*
 * Setup the app components for an app.
 */
var setupComponents = function(app) {

  // Make sure container ID directory exists.
  if (!fs.existsSync(app.config.appCidsRoot))  {
    fs.mkdirSync(app.config.appCidsRoot);
  }

  // Map config app components to app components.
  app.components = _.map(app.config.appComponents, function(component, name) {
    return createComponent(app, name, component);
  });

  // Update the config app components.
  app.config.appComponents = app.components;

};

/*
 * Load a plugin's apps.
 */
var loadPlugins = exports.loadPlugins = function(app, callback) {

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

  // Get provider.
  return engine.provider()
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

    // Setup app components.
    setupComponents(app);

    return app;

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
var get = exports.get = function(appName, callback) {

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
  var data = _.remove(components, function(component) {
    if (component.name === 'data') {
      return component;
    }
  });
  if (data.length === 1) {
    // Put data component at the head of the list.
    components.unshift(data[0]);
  } else if (data.length > 1) {
    // This should never happen.
    assert(data.length <= 1, 'Should never happen!');
  }
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
 * Get install options object for a given app component.
 */
var getInstallOptions = function(app, component) {
  // Default options.
  // @todo: bcauldwell - This should be made generic, and not docker specific.
  var opts = {
    Hostname: component.hostname,
    name: component.containerName,
    Image: component.image.name
  };
  // If app has a data container, add a volume mount.
  if (component.dataContainerName) {
    opts.HostConfig = {VolumesFrom:[component.dataContainerName]};
  }
  // Extend default options with component's install options.
  return _.extend(opts, component.installOptions);
};

/*
 * Install a component.
 */
var installComponent = function(app, component, callback) {

  // Get component install options.
  component.installOptions = getInstallOptions(app, component);

  // Emit pre event.
  return core.events.emit('pre-install-component', component)
  // Build image.
  .then(function() {
    return engine.build(component.image)
    .catch(function(err) {
      throw new VError(err, 'Build failure.');
    });
  })
  // Create container.
  .then(function() {
    return engine.create(component.installOptions)
    .catch(function(err) {
      throw new VError(err, 'Create failure.');
    });
  })
  // Write cid file.
  .then(function(container) {
    if (container) {
      component.containerId = container.cid;
      var filepath = path.resolve(component.containerIdFile);
      return fs.writeFileAsync(filepath, container.cid);
    }
  })
  // Emit post event.
  .then(function() {
    return core.events.emit('post-install-component', component);
  })
  .catch(function(err) {
    throw new VError(err,
      'Error while installing component: %s',
      component.containerName
    );
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

  // Verify services are in a good state.
  return services.verify()
  // Emit pre event.
  .then(function() {
    return core.events.emit('pre-install', app);
  })
  // Add app to app registry.
  .then(function() {
    return disco.registerAppDir(app.config.appRoot);
  })
  // Install components.
  // @todo: bcauldwell - Need to revisit what happens when a component install
  //   throws and error.
  .then(function() {
    // Get components.
    return Promise.resolve(getComponents(app))
    // Filter out data if it exists, throw error if non data component exists.
    .filter(function(component) {
      // Find out if container exists.
      return engine.containerExists(component.containerId)
      .then(function(containerExists) {
        if (!containerExists) {
          // Container does not exist, so install it.
          return true;
        } else if (component.name === 'data') {
          // Data container already exists so don't install it again.
          return false;
        } else {
          // A non data container already exists, throw an error.
          throw new Error('Container already exists: ' +
            component.containerName);
        }
      });
    })
    // Install components one at a time.
    .map(function(component) {
      return installComponent(app, component);
    }, {concurrency: 1});
  })
  // Emit post event.
  .then(function() {
    return core.events.emit('post-install', app);
  })
  // Wrap errors.
  .catch(function(err) {
    throw new VError(err, 'Error while installing app: ' + pp(app.name));
  })
  // Return.
  .nodeify(callback);

};

/*
 * Get start options object for a given component.
 */
var getStartOptions = function(app, component, opts) {
  // Default options.
  var defaults = {
    PublishAllPorts: true,
    Binds: [app.rootBind + ':/src:rw']
  };
  return _.extend(defaults, opts);
};

/*
 * Start a component.
 */
var startComponent = function(app, component, callback) {

  // Get component's start options.
  component.opts = getStartOptions(app, component);

  // Emit pre event.
  return core.events.emit('pre-start-component', component)
  // Start component.
  .then(function() {
    return engine.start(component.containerId, component.opts);
  })
  // Emit post event.
  .then(function() {
    return core.events.emit('post-start-component', component);
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
  // Emit pre event.
  .then(function() {
    return core.events.emit('pre-start', app);
  })
  // Start components.
  // @todo: bcauldwell - We need to revisit what should happen if starting a
  //   component results in an error.
  .then(function() {
    return getComponents(app);
  })
  .map(function(component) {
    return startComponent(app, component);
  }, {concurrency: 1})
  // Emit post event.
  .then(function() {
    return core.events.emit('post-start', app);
  })
  // Return.
  .nodeify(callback);

};

/*
 * Stop a component.
 */
var stopComponent = function(component, callback) {

  // Emit pre event.
  return core.events.emit('pre-stop-component', component)
  // Stop container.
  .then(function() {
    return engine.stop(component.containerId);
  })
  // Emit post event.
  .then(function() {
    return core.events.emit('post-stop-component', component);
  })
  // Return.
  .nodeify(callback);

};

/**
 * Stops an app's components and turn off the engine if there aren't
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
  // Emit pre event.
  .then(function() {
    return core.events.emit('pre-stop', app);
  })
  // Stop components.
  // @todo: bcauldwell - We need to revisit what happens when stopping a
  // container throws an error.
  .then(function() {
    return Promise.resolve(getComponents(app))
    // Filter out components that don't exist.
    .filter(function(component) {
      return engine.containerExists(component.containerId);
    })
    .map(_.ary(stopComponent, 1), {concurrency: 1})
    .all();
  })
  // Emit post event.
  .then(function() {
    return core.events.emit('post-stop', app);
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
var restart = exports.restart = function(app, callback) {

  // Stop app.
  return stop(app)
  // Start app.
  .then(function() {
    return start(app);
  })
  // Return.
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

  // Emit pre event.
  return core.events.emit('pre-uninstall', app)
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
var destroy = exports.destroy = function(app, callback) {

  // Emit pre event.
  return core.events.emit('pre-destroy', app)

  // Make sure app is stopped.
  .then(function() {
    return Promise.try(function() {
      return isRunning(app)
      .then(function(isRunning) {
        if (isRunning) {
          return stop(app);
        }
      });
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
var rebuild = exports.rebuild = function(app, callback) {

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
