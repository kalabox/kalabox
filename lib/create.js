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
   * Download the app skeleton or copy over the dir specified in FROM
   */
  var createAppSkeleton = function(app, dest, from) {

    // Needs downloads
    var needsDownload = (app.task.pkg.url && !from) ? true : false;

    // Start the chain
    return Promise.try(function() {

      // If this is a remote package then download it and
      // return the directory
      if (needsDownload) {
        return kbox.util.download.downloadFiles([app.task.pkg.url], dest);
      }

      // Otherwise just copy from --from
      else {

        return Promise.fromNode(function(cb) {

          // Make sure we overwrite
          var options = {clobber: true};

          // Helpful debug
          log.debug('Copying', from, dest, options);

          // Do the copying
          fs.copy(from, dest, options, cb);

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

    // Create a starting point for our config that events can
    // hook into and mod
    var data = {
      config: _.merge(defaultConf, getOverrides(app.options, results)),
      results: results,
      pkg: pkgConf
    };

    // Customize pkg.json with our app name
    pkgConf.name = results.name;

    // Let other things mod conf
    return kbox.core.events.emit('pre-create-configure', data)

    // Update source files with our new stuff
    .then(function() {
      kbox.util.yaml.toYamlFile(data.config, kalaboxFile);
      fs.writeFileSync(pkgFile, JSON.stringify(pkgConf, null, 2));
    })

    // This is probably not very helpful but symmetry and all
    .then(function() {
      return kbox.core.events.emit('post-create-configure', data);
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

    // Make sure we are in a clean place before we get dirty
    kbox.core.log.status('Cleaning up.');
    return kbox.app.cleanup()

    // Download the app skeleton and extract it to our destination
    .then(function() {
      kbox.core.log.status('Creating app structure.');
      return createAppSkeleton(protoApp, dest, results.from);
    })

    // Merge in our settings to the new app
    .then(function() {
      kbox.core.log.status('Configuring app.');
      return configureApp(protoApp, results);
    })

    // Install the new app
    .then(function() {

      // Get app config from new app
      var config = kbox.core.config.getAppConfig(dest);

      // Emit pre create event.
      kbox.core.log.status('Running pre create tasks.');
      return kbox.core.events.emit('pre-create-app', config)

      // Create a new app object
      .then(function() {
        return kbox.app.create(results.name, config, results);
      })

      // Report to metrics.
      .tap(function(app) {
        return kbox.metrics.reportAction(
          ['create', protoApp.name].join(':'),
          {app: app}
        );
      })

      // Install and start the SOB
      .tap(function(app) {
        app.status('Starting app.');
        return kbox.app.start(app);
      });

    })

    // Emit post create event.
    .tap(function(app) {
      app.status('Running post create tasks.');
      return app.events.emit('post-create');
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
  var buildTask = function(task, type) {

    // Make sure we are going to add a task with a real app
    if (!get(type)) {
      // todo: something useful besides silentfail
      // todo: never forget how funny this was/is/will always be
      throw new Error('F!');
    }

    // Get the app plugin metadata
    var app = get(type);

    // Create the basic task data
    task.path = ['create', type];
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

    // Specify an alternate location to grab the app skeleton
    task.options.push({
      name: 'from',
      kind: 'string',
      description: 'Local path to override app skeleton (be careful with this)',
    });

    // The func that this app create task runs
    task.func = function(done) {

      // Grab the CLI options that are available
      var options = this.options;

      // Filter out interactive questions based on passed in options
      var questions = kbox.util.cli.filterQuestions(inquiry, options);

      // Launch the inquiry
      inquirer.prompt(questions, function(answers) {

        // Add the create type to the results object
        // NOTE: the create type can be different than the
        // type found in the config aka config.type = php but
        // answers._type = drupal7
        answers._type = type;

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
