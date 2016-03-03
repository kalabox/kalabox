/**
 * App creation stuff for Kalabox.
 *
 * @name create
 */

'use strict';

// The create sauce
module.exports = function() {

  // Intrinsic modules.
  var path = require('path');

  // Npm modules
  var _ = require('lodash');
  var fs = require('fs-extra');
  var inquirer = require('inquirer');

  // Kbox modules
  var kbox = require('./kbox.js');
  var Promise = require('./promise.js');

  // Instantiate our app singleton
  var apps = {};

  // Debug info logging function.
  var log = require('./core/log.js').make('CREATE');

  /**
   * Adds a type of app that you can create and options, interactive inquires
   * and other fun stuff too that app.
   * @memberof create
   * @static
   * @method
   * @arg {string} appName - What app to attach the data to.
   * @arg {Object} data - A task or option to add to the app.
   * @example
   * // This will create a command called `kbox create drupal`.
   * kbox.create.add('drupal', {
   *   task: {
   *     name: 'Drupal',
   *     module: 'kalabox-app-drupal',
   *     description: 'Creates a Drupal app.'
   *   }
   * });
   *
   * // This will add a command line option called `name` to `kbox create drupal`.
   * // It will also add interactive step asking for the name to be inputted if
   * // it is not passed in to the CLI. The result of this will end up at the
   * // top level of the app's kalabox.json in the appName key.
   * kbox.create.add('drupal', {
   *   option: {
   *     name: 'name',
   *     weight: -99,
   *     task: {
   *       kind: 'string',
   *       description: 'The name of your app.',
   *     },
   *     inquire: {
   *       type: 'input',
   *       message: 'What will this app be called',
   *       validate: function(value) {
   *         // @todo some actual validation here
   *         return true;
   *       },
   *       filter: function(value) {
   *         return _.kebabCase(value);
   *       },
   *       default: 'My Drupal App'
   *     },
   *     conf: {
   *       type: 'global',
   *       key: 'appName'
   *     }
   *   }
   * });
   *
   * // This add's an interactive step to `kbox drupal create` asking the
   * // user to select a drupal version.
   * kbox.create.add('drupal', {
   *   option: {
   *     name: 'drupal-version',
   *     weight: -98,
   *     inquire: {
   *       type: 'list',
   *       message: 'What major version of drupal',
   *       default: '7',
   *       choices: Object.keys(drupalMatrix)
   *     }
   *   }
   * });
   */
  var add = function(name, data) {

    /*
     * Helper to get default options
     */
    var getDefaultOptions = function(name, data) {
      return {
        name: null,
        task: null,
        weight: 0,
        inquire: null,
        conf: {
          type: 'pluginconfig',
          key: data.option.name || null,
          plugin: name
        }
      };
    };

    if (!apps[name]) {
      create(name);
    }
    if (data.task) {
      apps[name].task = data.task;
    }
    if (data.option) {
      var merge = _.merge({}, getDefaultOptions(name, data), data.option);
      apps[name].options.push(merge);
    }
  };

  /*
   * Adds a new app plugin to the mix
   */
  var create = function(appName) {
    var appDefaults = {
      name : null,
      task: {
        name: null,
        description: null
      },
      options: []
    };
    apps[appName] = appDefaults;
    apps[appName].name = appName;
  };

  /*
   * Grabs an app plugin, or returns false
   */
  var get = function(appName) {
    if (appName) {
      var options = _.sortBy(apps[appName].options, 'weight');
      apps[appName].options = options;
      return apps[appName];
    }
    return false;
  };

  /*
   * ALL THE APP PLUGINZZZ
   */
  var getAll = function() {
    return apps;
  };

  /*
   * Download the app skeleton and copy over the files
   * optionally this can just update a preexisting skeleton
   */
  var createAppSkeleton = function(app, dest) {

    // Needs downloads
    var needsDownload = (app.task.pkg.url) ? true : false;

    // Start the chain
    return Promise.try(function() {

      // If this is a remote package then download it and return the directory
      if (needsDownload) {
        // Get the stuff we need for downloading
        var downloadDir = kbox.util.disk.getTempDir();
        var downloadFiles = kbox.util.download.downloadFiles;

        // Download the files
        return downloadFiles([app.task.pkg.url], downloadDir)

        .then(function() {
          // We need to actually scan and look for files because we dont
          // know what crazy commit hash github will append to our dir
          // @todo: it can be a big issue if we end up with multiple
          // directories containing the project name
          var downloadedFiles = fs.readdirSync(downloadDir);
          var appDir = _.find(downloadedFiles, function(file) {
            return _.includes(file, app.task.pkg.folder);
          });
          return path.join(downloadDir, appDir, app.task.pkg.path);
        });
      }

      // Otherwise just pass back the local location
      else {
        return app.task.pkg.path;
      }

    })

    // Copy the app over
    .tap(function(dir) {

      return Promise.fromNode(function(cb) {

        // Make sure we overwrite
        var options = {
          clobber: true
        };

        // Helpful debug
        log.debug('Copying', dir, dest, options);

        // Do the copying
        fs.copy(dir, dest, options, cb);

        // Return the source directory
        return dir;

      });
    })

    // Remove download directory so we are always fresh
    // @todo: if we have more precise download dir finding this should
    // be unneeded
    .then(function(dir) {
      if (needsDownload) {
        return Promise.fromNode(function(cb) {
          // Find parent directory
          var dirParts = dir.split(path.sep);
          var removeDir = _.remove(dirParts, function(part) {
            return part !== app.task.pkg.path;
          });
          // Remove that dir
          fs.remove(removeDir.join(path.sep), cb);
        });
      }
    });
  };

  /*
   * Object of user overrides to a default app object
   */
  var getOverrides = function(options, results) {

    // Start the collector
    var overrides = {};

    // Construct the overrides
    _.forEach(options, function(opt) {

      // Add to top level if this is global
      if (opt.conf.type === 'global') {
        overrides[opt.conf.key] = results[opt.name];
      }

      // Else use the conf properties
      else {

        // Grab our object chain
        var type = opt.conf.type;
        var plugin = opt.conf.plugin;
        var key = opt.conf.key;

        // Add in things that might be undefined
        if (!overrides[type]) {
          overrides[type] = {};
        }
        if (!overrides[type][plugin]) {
          overrides[type][plugin] = {};
        }

        // Set the value
        overrides[type][plugin][key] = results[opt.name];
      }
    });

    // Return the overrides
    return overrides;

  };

  /*
   * Take an app skeleton and write relevant metadata to it
   */
  var configureApp = function(app, results, callback) {

    // Figure out where our app skeleton lives
    var dir = (results.dir) ? results.dir : process.cwd();
    var appPath = path.join(dir, results.name);

    // Get paths to our config files
    var kalaboxFile = path.join(appPath, 'kalabox.yml');
    var pkgFile = path.join(appPath, 'package.json');

    // Load up the config
    var defaultConf = kbox.util.yaml.toJson(kalaboxFile);
    var pkgConf = require(pkgFile);

    // Merge in overrides
    var kalaboxConf = _.merge(defaultConf, getOverrides(app.options, results));

    // Customize pkg.json with our app name
    pkgConf.name = results.name;

    // Let other things add conf
    return kbox.core.events.emit('pre-create-configure', kalaboxConf)

    // Update source files with our new stuff
    .then(function() {
      kbox.util.yaml.toYamlFile(kalaboxConf, kalaboxFile);
      fs.writeFileSync(pkgFile, JSON.stringify(pkgConf, null, 2));
    })

    // This is probably not very helpful but symmetry and all
    .then(function() {
      return kbox.core.events.emit('post-create-configure', kalaboxConf);
    })

    // Return.
    .nodeify(callback);
  };

  /*
   * Create an app and then install it
   */
  var createApp = function(protoApp, results, callback) {

    // Create some globally vars for use in and-thens
    var dir = (results.dir) ? results.dir : process.cwd();
    var dest = path.join(dir, results.name);

    /*
     * Utility function to double check just in case
     * we are in an app but it has not been registered
     */
    var isAppByFiles = function() {
      var kalaboxYaml = path.join(process.cwd(), 'kalabox.yml');
      var pkgJson = path.join(process.cwd(), 'package.json');
      return fs.existsSync(kalaboxYaml) && fs.existsSync(pkgJson);
    };

    // Check to make sure we aren't already inside another app
    // since chaos can ensue this way
    if (kbox.core.deps.contains('app') || isAppByFiles()) {
      throw new Error('Cannot install apps inside of other apps');
    }

    kbox.core.log.status('Creating.');

    // Report to metrics.
    return Promise.try(function() {
      return kbox.metrics.reportAction(['create', protoApp.name].join(':'));
    })

    // Make sure we are in a clean place before we get dirty
    .then(function() {
      kbox.core.log.status('Cleaning up.');
      return kbox.app.cleanup();
    })

    // Emit pre create event.
    .then(function() {
      kbox.core.log.status('Running pre create tasks.');
      return kbox.core.events.emit('pre-create-app', protoApp);
    })

    // Download the app skeleton and extract it to our destination
    .then(function() {
      kbox.core.log.status('Creating app structure.');
      return createAppSkeleton(protoApp, dest);
    })

    // Merge in our settings to the new app
    .then(function() {
      kbox.core.log.status('Configuring app.');
      return configureApp(protoApp, results);
    })

    // Create a lockfile when create is happening so engine is not
    // auto-shutdown
    .then(function() {
      var sysRoot = kbox.core.deps.get('globalConfig').sysConfRoot;
      fs.writeFileSync(path.join(sysRoot, 'engine.lock'), 'locked');
    })

    // Check engine status to prompt install request
    .then(function() {
      kbox.core.log.status('Starting engine.');
      return kbox.engine.up();
    })

    // Install the new app
    .then(function() {

      // Get app config from new app
      var config = kbox.core.config.getAppConfig(dest);

      // Create a new app object
      return kbox.app.create(results.name, config)

      // Register the new app object so we can
      // correctly detech an app context
      .tap(function(app) {
        return kbox.setAppContext(app);
      })
      // Load up all the apps plugins
      .tap(function(app) {
        return kbox.app.loadPlugins(app);
      })
      // Install and start the SOB
      .tap(function(app) {
        kbox.core.log.status('Starting app.');
        return kbox.app.start(app);
      });
    })

    // Emit post create event.
    .tap(function(app) {
      kbox.core.log.status('Running post create tasks.');
      return kbox.core.events.emit('post-create-app', app);
    })

    // Destroy lock file
    .tap(function() {
      var sysRoot = kbox.core.deps.get('globalConfig').sysConfRoot;
      fs.unlinkSync(path.join(sysRoot, 'engine.lock'));
    })

    // Print message
    .then(function(app) {
      console.log(kbox.art.appStart(app));
    })

    // Return.
    .nodeify(callback);

  };

  /*
   * Parse our options meta data into relevant other meta data
   */
  var parseOptions = function(options, type) {
    return _.without(_.map(options, function(option) {
      if (option[type]) {
        option[type].name = option.name;
        return option[type];
      }
    }), undefined);
  };

  /**
   * Assembles create.add metadata and builds a task to create a certain kind
   * of app.
   * @memberof create
   * @static
   * @method
   * @arg {Object} task - A kbox task object.
   * @arg {string} appName - The name of the kind of app to be created.
   * @example
   * // Task to create kalabox apps
   * kbox.tasks.add(function(task) {
   *  kbox.create.buildTask(task, 'frontpage98');
   * });
   */
  var buildTask = function(task, appName) {

    // Make sure we are going to add a task with a real app
    if (!get(appName)) {
      // todo: something useful besides silentfail
      // todo: never forget how funny this was/is/will always be
      throw new Error('F!');
    }

    // Get the app plugin metadata
    var app = get(appName);

    // Create the basic task data
    task.path = ['create', appName];
    task.category = 'global';
    task.description = app.task.description;
    task.options = parseOptions(app.options, 'task');

    // Extract our inquiry
    var inquiry = _.identity(parseOptions(app.options, 'inquire'));

    // Add a generic app options to build elsewhere
    task.options.push({
      name: 'dir',
      kind: 'string',
      description: 'Creates the app in this directory. Defaults to CWD.',
    });

    // The func that this app create task runs
    task.func = function(done) {

      // Grab the CLI options that are available
      var options = this.options;

      // Filter out interactive questions based on passed in options
      var questions = kbox.util.cli.filterQuestions(inquiry, options);

      // Launch the inquiry
      inquirer.prompt(questions, function(answers) {

        // Create the app
        return createApp(app, _.merge({}, options, answers))

        // Return.
        .nodeify(done);

      });
    };
  };

  return {
    add: add,
    get: get,
    getAll: getAll,
    buildTask: buildTask,
    createApp: createApp
  };

};
