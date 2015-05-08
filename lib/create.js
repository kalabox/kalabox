'use strict';

/**
 * Module for registering apps that can be createed
 * @module kbox.create
 */

var _ = require('lodash');
var fs = require('fs-extra');
var path = require('path');
var core = require('./core.js');
var util = require('./util.js');
var chalk = require('chalk');
var appEngine = require('./app.js');

module.exports = function() {
  var apps = {};
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

  var remove = function(appName) {
    if (apps[appName]) {
      delete apps[appName];
    }
  };

  var get = function(appName) {
    if (appName) {
      var options = _.sortBy(apps[appName].options, 'weight');
      apps[appName].options = options;
      return apps[appName];
    }
    return false;
  };

  var getAll = function() {
    return apps;
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
    if (!get(appName)) {
      // todo: something useful besides silentfail
      console.log('F!');
    }
    else {
      var app = get(appName);
      task.path = ['create', appName];
      task.description = app.task.description;

      // Add app plugin stuff
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

      // Add global options
      task.options.push({
        name: 'install',
        alias: 'i',
        kind: 'boolean',
        description: 'Auto install app after creation.',
      });
      task.options.push({
        name: 'build-local',
        kind: 'boolean',
        description: 'Build images locally instead of pulling them remotely.'
      });
      task.options.push({
        name: 'start',
        alias: 's',
        kind: 'boolean',
        description: 'Auto start app after creation. Requires --install.',
      });
      task.options.push({
        name: 'dir',
        kind: 'string',
        description: 'Creates the app in this directory. Defaults to CWD.',
      });

      task.func = function(done) {
        // Filter questions based on passed in opts
        var options = this.options;
        questions = _.filter(questions, function(question) {
          var option = options[question.name];
          if (question.filter) {
            options[question.name] = question.filter(options[question.name]);
          }
          if (option === false || option === undefined) {
            return true;
          }
          else {
            return !_.includes(Object.keys(options), question.name);
          }
        });

        inquirer.prompt(questions, function(answers) {
          createApp(app, _.merge({}, options, answers), done);
        });
      };

    }
  };

  var createApp = function(app, results, done) {
    var srcRoot = core.deps.lookup('config').srcRoot;
    var dir = (results.dir) ? results.dir : process.cwd();
    var source = path.join(srcRoot, 'node_modules', app.task.module, 'app');
    var dest = path.join(dir, results.name);
    console.log(chalk.yellow('Building your app...'));
    fs.copy(source, dest, function(err) {
      if (err) {
        throw err;
      }
      else {
        instantiateApp(app, results, function(err) {
          var install = results.install;
          var start = results.start;
          if (install) {
            var config = core.config.getAppConfig(null, dest);
            appEngine.create(results.name, config, function(err, loadedApp) {
              if (err) {
                return done(err);
              }

              core.deps.register('appConfig', loadedApp.config, function(err) {
                if (err) {
                  return done(err);
                }

                core.deps.register('app', loadedApp, function(err) {
                  if (err) {
                    return done(err);
                  }

                  appEngine.loadPlugins(loadedApp, function(err) {
                    if (err) {
                      return done(err);
                    }

                    appEngine.install(loadedApp, function(err) {
                      if (err) {
                        return done(err);
                      }

                      console.log(chalk.green('App installed.'));
                      if (start) {
                        appEngine.start(loadedApp, function(err) {
                          if (err) {
                            done(err);
                          }
                          else {
                            console.log(chalk.green('App started.'));
                            done();
                          }
                        });
                      } else {
                        console.log(chalk.green(
                          'App intalled!' +
                            ' Run kbox start inside your app.'
                        ));
                        done();
                      }
                    });
                  });

                });
              });
            });

          }
          else {
            // @todo: more imformative message?
            console.log(chalk.green(
              'App instantiated!' +
                ' Run kbox install and kbox start inside your app'
            ));
            done();
          }
        });
      }
    });
  };

  var instantiateApp = function(app, results, callback) {
    var sourcePath = path.join(
      core.deps.lookup('config').srcRoot,
      'node_modules',
      app.task.module,
      'app'
    );
    // Load source files
    var sourceKbFile = path.join(sourcePath, 'kalabox.json');
    var sourcePkgFile = path.join(sourcePath, 'package.json');
    var kalaboxJson = require(sourceKbFile);
    var pkgJson = require(sourcePkgFile);

    // Customize kb.json
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

    // Customize pkg.json
    pkgJson.name = results.name;

    // Update filezzz
    var dir = (results.dir) ? results.dir : process.cwd();
    var appPath = path.join(dir, results.name);

    var destKbFile = path.join(appPath, 'kalabox.json');
    var destPkgFile = path.join(appPath, 'package.json');
    fs.writeFileSync(destKbFile, JSON.stringify(kalaboxJson, null, 2));
    fs.writeFileSync(destPkgFile, JSON.stringify(pkgJson, null, 2));

    // Install node deps
    util.npm.installPackages(appPath, function(err) {
      if (err) {
        callback(err);
      } else {
        callback();
      }
    });
  };

  return {
    add: add,
    get: get,
    getAll: getAll,
    buildTask: buildTask
  };

};
