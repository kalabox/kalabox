/**
 * Module for interacting with and managing user defined apps.
 * @module kbox.app
 */

'use strict';

// Intrinsic modules.
var path = require('path');

// Npm modules.
var _ = require('lodash');

// Kbox modules.
var Promise = require('./promise.js');
var core = require('./core.js');
var engine = require('./engine.js');
var util = require('./util.js');
var registry = require('./app/registry.js');
var kbox = require('./kbox.js');
var rmdir = require('rimraf');

// Expose register app
exports.register = registry.registerApp;

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
 * Get a list of an app's compose files.
 */
var getComposeFiles = function(app) {
  return app.composeCore;
};

/*
 * Return the default app compose object
 */
var getCompose = function(app) {
  return {
    compose: getComposeFiles(app),
    opts: {project: app.name}
  };
};

/*
 * Helper to replace image
 */
var replaceImgVersion = function(image) {
  var split = image.split(':');
  if (split[1] === '$KALABOX_IMG_VERSION') {
    var tag = core.deps.get('globalConfig').imgVersion;
    return [split[0], tag].join(':');
  }
  else {
    return image;
  }
};

/*
 * Helper to sort out build stuff
 * @todo: remove this when we simplify our docker handling
 */
var buildImage = function(app, name, component) {

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

    // Return our result
    return image;

  }
};

/*
 * Create an app component from an app component spec.
 */
var createComponent = function(app, name, compose) {

  // Init component with component spec.
  var component = _.extend({}, compose);

  // Emit pre component create event.
  return core.events.emit('pre-component-create', {app: app, cmp: component})

    // Build the normal component stuff
  .then(function() {

    // Name.
    component.name = name;
    // Image/Build
    component.image = buildImage(app, name, component);
    // Hostname
    component.hostname = compose.hostname || [name, app.domain].join('.');
    // App domain.
    component.appDomain = app.domain;
    // Url.
    component.url = 'http://' + component.hostname;

  })

  // Post component create event
  .then(function() {
    var cmp = component;
    return core.events.emit('post-component-create', {app: app, cmp: cmp});
  })

  // Set our ENV and then return the component
  .then(function() {
    // Set our component config into the env
    var identifier = ['app', name].join('_');
    core.env.setEnvFromObj(component, identifier);
    return component;
  });

};

/*
 * Load the apps components
 */
var loadComponents = function(app) {

  // Start component collector
  var components = {};

  // Load our core kalabox-compose.yml
  _.forEach(app.composeCore, function(core) {
    _.extend(components, util.yaml.toJson(core));
  });

  // Check if engine is up
  return engine.isUp()

  // If engine is up try to get container info
  // otherwise return the basic
  .then(function(isUp) {
    if (isUp) {
      var cmps = _.map(components, function(component, name) {
        component.name = name;
        return component;
      });
      return Promise.map(cmps, function(cmp) {

        // Build a search object to get IDs
        var searchFor = getCompose(app);
        searchFor.opts.service = cmp.name;

        // Get info abour our containers
        return engine.inspect(searchFor)
        .then(function(data) {
          if (!_.isEmpty(data)) {
            cmp.cid = data.Id;
            cmp.containerId = _.trimLeft(data.Name, '/');
            cmp.containerName = cmp.containerId;
          }
        })
        .then(function() {
          return createComponent(app, cmp.name, cmp);
        });
      });
    }
    else {
      return _.map(components, function(component, name) {
        return createComponent(app, name, component);
      });
    }
  })

  // Set our app info
  .then(function(components) {
    app.config.appComponents = components;
    app.components = components;
    return _.toArray(app.components);
  });

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
    // Domain
    app.domain = config.domain;
    // Hostname.
    app.hostname = [name, config.domain].join('.');
    // Url.
    app.url = 'http://' + app.hostname;
    // Root.
    app.root = config.appRoot;
    // Root bind.
    app.rootBind = provider.path2Bind4U(app.root);
    // Config.
    app.config = config;
    // Config home bind.
    app.config.homeBind = provider.path2Bind4U(app.config.home);
    // Load in any plugin config if its there
    app.config.pluginconfig = config.pluginconfig || {};
    // Define core kalabox compose file
    app.composeCore = [path.join(app.root, 'kalabox-compose.yml')];
    // Add an override file to compose extra if it exists
    var overrideFile = path.join(app.root, 'kalabox-compose-override.yml');
    if (fs.existsSync(overrideFile)) {
      app.composeCore.push(overrideFile);
    }

    // Return our app
    return app;
  })

  // Emit post event.
  .tap(function(app) {
    return core.events.emit('post-app-create', app);
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
  return registry.getApps()
  // Map list of app names to list of apps.
  .then(function(apps) {
    return Promise.map(apps, function(app) {
      var config = core.config.getAppConfig(app.dir);
      return create(app.name, config);
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
    // Pass the apps on to the each
    return apps;
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
    return core.events.emit('pre-app-uninstall', app);
  })
  // Get our components
  .then(function() {
    return loadComponents(app);
  })
  // Kill components.
  .then(function(components) {
    var killComponents = _.map(components, function(component) {
      return _.merge(component, {opts: {v: false}});
    });
    return engine.remove(killComponents);
  })
  // Emit post event.
  .then(function() {
    return core.events.emit('post-app-uninstall', app);
  })
  // Return.
  .nodeify(callback);

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
 * kbox.app.cleanup(function(errs) {
 *   if (err) {
 *     throw err;
 *   } else {
 *     console.log('PURIFICATION COMPLETE!');
 *   }
 * });
 */
var cleanup = exports.cleanup = function(callback) {

  // Get all our containers
  return list()

  .map(function(app) {
    return app.name;
  })

  // Filter out non-app containers
  .then(function(apps) {
    return Promise.filter(engine.list(), function(container) {
      return container.kind === 'app' && !_.includes(apps, container.app);
    });
  })

  // Stop containers if needed
  .tap(function(containers) {
    return engine.stop(containers);
  })

  // Kill containers if needed
  .tap(function(containers) {
    return engine.remove(containers);
  })

  // Inform the user
  .then(function() {
    core.log.debug('APP CLEANUP => COMPLETE');
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
  // Emit pre start event.
  .then(function() {
    return core.events.emit('pre-app-start', app);
  })
  // Start core containers
  .then(function() {
    return engine.start(getCompose(app));
  })
  // Load the components
  .then(function() {
    return loadComponents(app);
  })
  // Emit post start event.
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
  // Stop components.
  .then(function() {
    return engine.stop(getCompose(app));
  })
  // Load the components
  .then(function() {
    return loadComponents(app);
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
    return core.events.emit('pre-app-destroy', app);
  })
  // Make sure app is stopped.
  .then(function() {
    return stop(app);
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
    return registry.removeApp({name: app.name});
  })
  // Emit post event.
  .then(function() {
    return core.events.emit('post-app-destroy', app);
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
    return start(app);
  })
  // Return.
  .nodeify(callback);

};
