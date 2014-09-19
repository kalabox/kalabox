var EventEmitter = require("events").EventEmitter
var fs = require('fs');
var path = require('path');
var util = require("util");

var _ = require('lodash');
var async = require('async')
var Q = require('q');

// Main app path & config setup
var manager = require('./appmanager.js');
var baseDir = path.resolve(__dirname, '../');
var config = require('../config.json');
// Data path setup ~/.kalabox
var homePath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var dataPath = path.resolve(homePath, '.kalabox');
var appPath = path.resolve(dataPath, 'apps');
// Create ~/.kalabox/apps if it doesn't exist
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath);
}
if (!fs.existsSync(appPath)) {
  fs.mkdirSync(appPath);
}
// Instantiate docker object from config settings.
var Docker = require('dockerode');
var docker =  new Docker(config.docker);

var App = function(apppath) {
  // TODO: Validate path and .kalabox.json file

  this.docker = docker;
  this.manager = manager;
  EventEmitter.call(this);
  var _this = this;
  this.path = apppath;
  this.config = require(path.resolve(this.path, '.kalabox.json'));
  this.tasks = {};

  this.appname = this.config.name;
  this.appdomain = this.appname + '.' + config.domain;
  this.url = 'http://' + this.appdomain;

  this.prefix = this.config.name + '_';
  this.hasData = this.config.components.hasOwnProperty('data');
  this.dataCname = this.hasData ? this.prefix + 'data' : null;

  // set/create ~/.kalabox/apps/<appname>
  this.kalaboxPath = path.resolve(appPath, this.appname);
  if (!fs.existsSync(this.kalaboxPath)) {
    fs.mkdirSync(this.kalaboxPath);
  }
  // set/create ~/.kalabox/apps/<appname>/cids
  this.cidPath = path.resolve(this.kalaboxPath, 'cids');
  if (!fs.existsSync(this.cidPath)) {
    fs.mkdirSync(this.cidPath);
  }

  // Set more properties for each component
  _.map(this.config.components, function(component, key) {
    component.key = key;
    // component hostname format: mysite-web.kbox
    // Used when multiple containers may require proxy access
    component.hostname = component.key + '.' + _this.appdomain;
    component.url = 'http://' + component.hostname;
    component.dataCname = _this.hasData && key !== 'data' ? _this.dataCname : null;
    component.cname = _this.prefix + key;
    component.cidfile = path.resolve(_this.cidPath, key);

    if (fs.existsSync(component.cidfile)) {
      component.cid = fs.readFileSync(component.cidfile, 'utf8');
    }
    // set component build source to which ever valid path is found first:
    // 1) relative to .kalabox.json file, 2) relative to ~/.kalabox, 3) relative to the the Kalabox source
    if (component.build) {
      var src = loadPath(_this, component.src);
      if (src === false) {
        component.build = false;
      }
      component.src = src;
    }

    // Load plugins
    _this.plugins = {};
    if (!_this.config.plugins) {
      _this.config.plugins = {};
    }
    var default_plugins = ['hipache', 'kalabox'];
    for (var x in default_plugins) {
      if (!_this.config.plugins[default_plugins[x]]) {
        _this.config.plugins[default_plugins[x]] = {};
      }
    }
    _.map(_this.config.plugins, function(plugin, key) {
      plugin.key = key;
      var pluginPath = 'plugins/' + key;
      if (plugin.path) {
        pluginPath = plugin.path + '/' + key;
      }
      var src = loadPath(_this, pluginPath);
      if (src !== false) {
        _this.plugins[key] = require(src)(plugin, _this);
      }
    });

  });

  /**
   * Initialize the app by creating & starting the Docker containers.
   */
  this.init = function() {
    // TODO: Validate if <appname>_ containers exist already
    _this.emit('pre-init');
    _this.emit('pre-create');
    var components = _.toArray(_.cloneDeep(_this.config.components));
    async.mapSeries(components, createContainer, function(err, result) {
      _this.emit('post-create');
      _this.emit('post-init');
    });
  };

  /**
   * Creates the container of a specific component.
   *
   * @param component
   * @param done
   */
  var createContainer = function(component, done) {
    _this.emit('pre-create-component', component);

    var opts = {
      Hostname: component.hostname,
      name: component.cname,
      Image: component.image,
      Dns: ['8.8.8.8', '8.8.4.4'],
      Env: ['APPNAME='+_this.appname, 'APPDOMAIN='+_this.appdomain]
    };

    if (component.createOpts) {
      _(component.createOpts).each(function(opt, key) {
        opts[key] = opt;
      });
    }

    console.log(opts);

    docker.createContainer(opts, function(err, container) {
      if (container) {
        var fs = require('fs');
        fs.writeFileSync(path.resolve(component.cidfile), container.id);
        component.cid = container.id;
        console.log(component.key, 'created');
        _this.emit('post-create-component', component);
        done();
      }
    });
  };

  /**
   * Start all app containers.
   */
  this.start = function() {
    _this.emit('pre-start');
    var components = _.toArray(_.cloneDeep(_this.config.components));
    async.mapSeries(components, startContainer, function(err, result) {
      console.log('done with startContainer');
      _this.emit('post-start');
    });
  };

  /**
   * Starts the container of a specific component.
   *
   * @param component
   * @param done
   */
  var startContainer = function(component, done) {
    _this.emit('pre-start-component', component);
    if (component.events && component.events['pre-start-component']) {
      for (var i in component.events['pre-start-component']) {
        _this.tasks[component.events['pre-start-component'][i]]();
      }
    }

    var opts = {
      Hostname: component.hostname,
      PublishAllPorts: true,
      VolumesFrom: component.dataCname,
      Env: ['APPNAME='+_this.appname]
    };

    if (component.startOpts) {
      _(component.startOpts).each(function(opt, key) {
        opts[key] = opt;
      });
    }

    docker.getContainer(component.cid).start(opts, function(err, data) {
      console.log(component.key, 'started');
      _this.emit('post-start-component', component);
      done();
    });
  };

  /**
   * Stop all app containers.
   */
  this.stop = function() {
    _this.emit('pre-stop');
    var components = _.toArray(_.cloneDeep(_this.config.components));
    async.map(components, stopContainer, function(err, result) {
      _this.emit('post-stop');
    });
  };

  /**
   * Stops the container of a specific component.
   *
   * @param component
   * @param done
   */
  var stopContainer = function(component, done) {
    _this.emit('pre-stop-component', component);
    docker.getContainer(component.cid).stop(function(err, data) {
      _this.emit('post-stop-component', component);
      done();
    });
  };

  /**
   * Restart all app containers.
   */
  this.restart = function() {
    _this.emit('pre-restart');
    var components = _.toArray(_.cloneDeep(_this.config.components));
    async.map(components, restartContainer, function(err, result) {
      _this.emit('post-restart');
    });
  };

  /**
   * Restart the container of a specific component.
   *
   * @param component
   * @param done
   */
  var restartContainer = function(component, done) {
    _this.emit('pre-restart-component', component);
    docker.getContainer(component.cid).stop(function(err, data) {
      docker.getContainer(component.cid).start(function(err, data) {
        _this.emit('post-restart-component', component);
        done();
      });
    });
  };

  /**
   * Kill all app containers.
   */
  this.kill = function() {
    _this.emit('pre-kill');
    var components = _.toArray(_.cloneDeep(_this.config.components));
    async.map(components, killContainer, function(err, result) {
      _this.emit('post-kill');
    });
  };

  /**
   * Kill the container of a specific component.
   *
   * @param component
   * @param done
   */
  var killContainer = function(component, done) {
    _this.emit('pre-kill-component', component);
    docker.getContainer(component.cid).kill(function(err, data) {
      _this.emit('post-kill-component', component);
      done();
    });
  };

  /**
   * Remove all app containers.
   */
  this.remove = function() {
    _this.emit('pre-remove');
    var components = _.toArray(_.cloneDeep(_this.config.components));
    async.map(components, removeContainer, function(err, result) {
      _this.emit('post-remove');
    });
  };

  /**
   * Remove the container of a specific component.
   *
   * @param component
   * @param done
   */
  var removeContainer = function(component, done) {
    _this.emit('pre-remove-component', component);
    docker.getContainer(component.cid).remove(function(err, data) {
      if (!err && fs.existsSync(component.cidfile)) {
        fs.unlinkSync(component.cidfile);
      }
      _this.emit('post-remove-component', component);
      done();
    });
  };

  /**
   * Pull all component images.
   */
  this.pull = function() {
    _this.emit('pre-remove');
    var deferred = Q.defer();
    var pulls = _.filter(_this.config.components, function(component) {
      return component.build !== true;
    });

    _(pulls).each(function(component) {
      pullImage(component, pulls, deferred);
    });

    return deferred.promise;
  };

  /**
   * Pull the image of a specific component.
   *
   * @param component
   * @param done
   */
  var pullImage = function(component, components, deferred) {
    _this.emit('pre-pull-component', component);
    docker.pull(component.image, function (err, stream) {
      if (err) {
        throw err;
      }

      stream.on('data', function(data) {
        // this is needed?
      });

      stream.on('end', function() {
        component.pulled = true;
        console.log(component.image + ' pull complete.');
        _this.emit('post-pull-component', component);

        if (_.every(components, {'pulled': true})) {
          _(components).each(function(component) {
            delete component.pulled;
          });

          deferred.resolve();
        }

      });
    });
  };

  /**
   * Build all component images.
   */
  this.build = function() {
    _this.emit('pre-remove');
    var deferred = Q.defer();

    var builds = _.filter(_this.config.components, function(component) {
      return component.build === true;
    });

    _(builds).each(function(component) {
      buildImage(component, builds, deferred);
    });

    return deferred.promise;
  };

  /**
   * Build the image of a specific component.
   *
   * @param component
   * @param done
   */
  var buildImage = function(component, components, deferred) {
    _this.emit('pre-build-component', component);
    console.log('building ' + component.image);

    var filename = component.key + '.tar';
    var file = path.resolve(component.src, filename);

    try {
      console.log(component.src);
      process.chdir(component.src);
    }
    catch (err) {
      throw err;
    }

    var exec = require('child_process').exec;
    exec('tar -cvf ' + file+ ' *', function (err, stdout, stderr) {
      if (err) {
        throw err;
      }

      var data = fs.createReadStream(file);
      docker.buildImage(data, {t: component.image}, function (err, stream){
        if (err) {
          throw err;
        }

        stream.on('data', function(data) {
          // this is needed?
        });

        stream.on('end', function() {
          fs.unlinkSync(file);
          process.chdir(baseDir);

          component.built = true;
          console.log(component.image + ' build complete.');
          _this.emit('post-build-component', component);

          if (_.every(components, {'built': true, 'build': true})) {
            _(components).each(function(component) {
              delete component.built;
            });
            deferred.resolve();
          }
        });
      });
    });
  };
};

/**
 * Fetches a valid path based on a given relative path.
 * - First looks relative to the .kalabox.json file
 * - Second looks relative to the ~/.kalabox directory
 * - Third looks relative to the Kalabox source
 *
 * @param app
 * @param src
 * @return path or false if not found.
 */
var loadPath = function(app, relativePath) {
  var src = path.resolve(app.path, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  src = path.resolve(dataPath, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  src = path.resolve(baseDir, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  return false;
};

util.inherits(App, EventEmitter);
module.exports = App;
