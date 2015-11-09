'use strict';

/**
 * Module for registering apps that can be createed
 * @module kbox.create
 */

// Intrinsic modules.
var path = require('path');
var url = require('url');

// Npm modules
var _ = require('lodash');
var chalk = require('chalk');
var VError = require('verror');
var fs = require('fs-extra');

// Kbox modules
var core = require('./core.js');
var art = require('./art.js');
var engine = require('./engine.js');
var metrics = require('./metrics.js');
var util = require('./util.js');
var appEngine = require('./app.js');
var Promise = require('./promise.js');

// The create sauce
module.exports = function() {

  // Instantiate our app singleton
  var apps = {};
  // To inquire is better to inquisite
  var inquirer = require('inquirer');

  /**
   * Adds a type of app that you can create and options, interactive inquires
   * and other fun stuff too that app.
   * @static
   * @method
   * @arg {string} appName - What app to attach the data to.
   * @arg {object} data - A task or option to add to the app.
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
  var add = function(appName, data) {
    var optionDefaults = {
      name: null,
      task: null,
      weight: 0,
      inquire: null,
      conf: {
        type: null,
        key: null,
        plugin: null
      }
    };

    if (!apps[appName]) {
      create(appName);
    }
    if (data.task) {
      apps[appName].task = data.task;
    }
    if (data.option) {
      var merge = _.merge({}, optionDefaults, data.option);
      apps[appName].options.push(merge);
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
        module: null,
        description: null
      },
      options: []
    };
    apps[appName] = appDefaults;
    apps[appName].name = appName;
  };

  /*
   * Removes an app plugin from the mix
   */
  var remove = function(appName) {
    if (apps[appName]) {
      delete apps[appName];
    }
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
  var copyAppSkeleton = function(app, dest) {

    // Get the stuff we need for downloading
    var downloadDir = util.disk.getTempDir();
    var downloadFiles = util.download.downloadFiles;

    // Get the module that started this create
    // @todo: validate app plugins set this correctly
    var project = app.task.module;

    // Grab the correct version that we need based on the dev mode factor
    var globalConfig = core.deps.get('globalConfig');

    // Figure out what version we want
    var version;
    if (globalConfig.devMode === true || globalConfig.devMode === 'true') {
      var vParts = globalConfig.version.split('.');
      version = 'v' + [vParts[0], vParts[1]].join('.');
    }
    else {
      var pkgString = _.find(globalConfig.apps, function(app) {
        return _.includes(app, project);
      });
      var parts = pkgString.split('@');
      version = 'v' + parts[1];
    }

    // Build our archive URL
    var format = (process.platform === 'win32') ? 'zipball' : 'tarball';
    var tarUrl = {
      protocol: 'https:',
      host: 'github.com',
      pathname: ['kalabox', project, format, version].join('/')
    };

    // Download the files
    return downloadFiles([url.format(tarUrl)], downloadDir)

    .then(function() {
      // We need to actually scan and look for files because we dont
      // know what crazy commit hash github will append to our dir
      // @todo: it can be a big issue if we end up with multiple
      // directories containing the project name
      var downloadedFiles = fs.readdirSync(downloadDir);
      return _.find(downloadedFiles, function(file) {
        return _.includes(file, project);
      });
    })

    // Copy the app over
    .then(function(dir) {
      var source = path.join(downloadDir, dir);
      var appSource = path.join(source, 'app');
      return Promise.fromNode(function(cb) {
        // Make sure we overwrite
        var options = {
          clobber: true
        };
        // Helpful debug
        core.log.debug('COPYING => ' + appSource + ' 2 ' + dest);
        core.log.debug('WITH OPTIONS => ' + JSON.stringify(options));
        // Do the copying
        fs.copy(appSource, dest, options, cb);
      })

      // Remove directory so we are always fresh
      .then(function() {
        return Promise.fromNode(function(cb) {
          fs.remove(source, cb);
        });
      });
    });
  };

  /*
   * Take an app skeleton and write relevant metadata to it
   */
  var instantiateApp = function(app, results, callback) {
    // Figure out where our app skeleton lives
    var dir = (results.dir) ? results.dir : process.cwd();
    var appPath = path.join(dir, results.name);
    var KbFile = path.join(appPath, 'kalabox.json');
    var PkgFile = path.join(appPath, 'package.json');

    // Load up the source kalabox/package sons of j
    var kalaboxJson = require(KbFile);
    var pkgJson = require(PkgFile);

    // Customize kalabox.json with options and answers
    app.options.forEach(function(opt) {
      if (opt.conf) {
        if (opt.conf.type === 'global') {
          kalaboxJson[opt.conf.key] = results[opt.name];
        }
        else if (opt.conf.type === 'plugin') {
          var plugin = opt.conf.plugin;
          var key = opt.conf.key;
          if (!kalaboxJson.pluginConf[plugin]) {
            kalaboxJson.pluginConf[plugin] = {};
          }
          if (kalaboxJson.pluginConf[plugin][key]) {
            kalaboxJson.pluginConf[plugin][key] = results[opt.name];
          }
          else {
            kalaboxJson.pluginConf[plugin][key] = results[opt.name];
          }
        }
      }
    });

    // Customize pkg.json with our app name
    pkgJson.name = results.name;

    return core.events.emit('pre-create-instantiate', kalaboxJson)

    // Update source files with our new stuff and then
    // npm install all the goodies
    .then(function() {
      fs.writeFileSync(KbFile, JSON.stringify(kalaboxJson, null, 2));
      fs.writeFileSync(PkgFile, JSON.stringify(pkgJson, null, 2));
    })

    // This is probably not very helpful but symmetry and all
    .then(function() {
      return core.events.emit('post-create-instantiate');
    })

    // Return.
    .nodeify(callback);
  };

  /*
   * Create an app and then install it
   */
  var createApp = function(app, results, callback) {

    // Create some globally vars for use in and-thens
    var dir = (results.dir) ? results.dir : process.cwd();
    var dest = path.join(dir, results.name);

    /*
     * Utility function to double check just in case
     * we are in an app but it has not been registered
     */
    var isAppByFiles = function() {
      var kJ = path.join(process.cwd(), 'kalabox.json');
      var pJ = path.join(process.cwd(), 'package.json');
      return fs.existsSync(kJ) && fs.existsSync(pJ);
    };

    // Check to make sure we aren't already inside another app
    // since chaos can ensue this way
    if (core.deps.contains('app') || isAppByFiles()) {
      throw new Error('Cannot install apps inside of other apps');
    }

    // Things are happening!!!
    console.log(chalk.yellow('Building your app...'));

    // Report to metrics.
    return Promise.try(function() {
      return metrics.reportAction('create:pantheon');
    })

    // Make sure app does not already exist.
    .then(function() {
      return appEngine.get(results.name);
    })

    // If we catch it means we are probably safe to create
    .catch(function(err) {
      var search = 'App "' + results.name + '" does not exist.';
      return !_.includes(err.message, search);
    })

    // Throw an error if we are trying to create an app
    // with this name already. We want to check this way
    // vs just checking the dir because if the user has a folder named this
    // but does not have a listed app we should overwrite
    .then(function(appExists) {
      core.log.debug('APP "' + results.name + '" EXISTS => ' + appExists);
      if (appExists) {
        throw new Error('App already exists: ' + dest);
      }
    })

    // Make sure we are in a clean place before we get dirty
    .then(function() {
      return appEngine.cleanup();
    })

    // Emit pre create event.
    .then(function() {
      return core.events.emit('pre-create-app', app);
    })

    // Download the app skeleton and extract it to our destination
    .then(function() {
      return copyAppSkeleton(app, dest);
    })

    // Instantiate the new app
    .then(function() {
      return instantiateApp(app, results);
    })

    // Create a lockfile when create is happening so engine is not
    // auto-shutdown
    .then(function() {
      var sysRoot = core.deps.get('globalConfig').sysConfRoot;
      fs.writeFileSync(path.join(sysRoot, 'engine.lock'), 'locked');
    })

    // Check engine status to prompt install request
    .then(function() {
      return engine.up();
    })

    // Install the new app
    .then(function() {

      // Get app config from new app
      var config = core.config.getAppConfig(null, dest);

      // Create a new app object
      return appEngine.create(results.name, config).bind({})

      // Register the new app object so we can
      // correctly detech an app context
      .then(function(loadedApp) {
        this.loadedApp = loadedApp;
        return core.deps.register('appConfig', loadedApp.config);
      })
      .then(function() {
        return core.deps.register('app', this.loadedApp);
      })
      // Load up all the apps plugins
      .then(function() {
        return appEngine.loadPlugins(this.loadedApp);
      })
      // Install the SOB
      .then(function() {
        return appEngine.install(this.loadedApp);
      });
    })

    // Emit post create event.
    .then(function() {
      var app = core.deps.get('app');
      return core.events.emit('post-create-app', app);
    })

    // Destroy lock file
    .then(function() {
      var sysRoot = core.deps.get('globalConfig').sysConfRoot;
      fs.unlinkSync(path.join(sysRoot, 'engine.lock'));
    })

    // Print message
    .then(function() {
      var app = core.deps.get('app');
      console.log(art.postCreate(app));
    })

    // Return.
    .nodeify(callback);

  };

  /**
   * Assembles create.add metadata and builds a task to create a certain kind
   * of app.
   * @static
   * @method
   * @arg {object} task - A kbox task object.
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
      // todo: never forget how funny this was/is/will alway be
      console.log('F!');
    }
    else {

      // Get the app plugin metadata
      var app = get(appName);

      // Create a task path for that app plugin
      task.path = ['create', appName];
      task.category = 'global';
      // And a description
      task.description = app.task.description;

      // Generate a list of our inquiries and task options
      var questions = [];
      app.options.forEach(function(opt) {
        if (opt.inquire) {
          opt.inquire.name = opt.name;
          questions.push(opt.inquire);
        }
        if (opt.task) {
          opt.task.name = opt.name;
          task.options.push(opt.task);
        }
      });

      // Add in some global options that every app gets
      // Lets the user install their app with its local dockerfilez
      task.options.push({
        name: 'build-local',
        kind: 'boolean',
        description: 'Build images locally instead of pulling them remotely.'
      });

      // Put this app someplace else
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
        questions = _.filter(questions, function(question) {

          // Get the option name
          var option = options[question.name];

          // If the question has filter we need to apply that to the option
          // so it is parsed correctly
          if (question.filter) {
            options[question.name] = question.filter(options[question.name]);
          }

          // If there is no option then this is pretty easy
          if (option === false || option === undefined) {
            return true;
          }

          else {
            // Return questions that are not passed in options
            return !_.includes(Object.keys(options), question.name);
          }
        });

        // Launch the inquiry
        inquirer.prompt(questions, function(answers) {

          // Create the app
          return createApp(app, _.merge({}, options, answers))

          // Return.
          .nodeify(done);

        });
      };
    }
  };

  return {
    add: add,
    get: get,
    getAll: getAll,
    buildTask: buildTask,
    copyAppSkeleton: copyAppSkeleton
  };

};
