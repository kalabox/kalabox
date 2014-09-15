var EventEmitter = require("events").EventEmitter
var fs = require('fs');
var path = require('path');
var util = require("util");

var _ = require('lodash');
var async = require('async')
var Q = require('q');
var redis = require('redis');

var baseDir = path.resolve('./');
var config = require('../config.json');
var Docker = require('dockerode');
var docker =  new Docker(config.docker);

var App = function(appname) {
  this.docker = docker;
  EventEmitter.call(this);
  var _this = this;
  var appdir = path.resolve(config.appDir);
  this.appPath = path.resolve(appdir, appname);
  this.config = require(path.resolve(this.appPath, 'config.json'));
  this.appname = appname;
  this.appdomain = appname + '.' + config.domain;
  this.url = 'http://' + this.appdomain;
  this.cidPath = path.resolve(this.appPath, 'cids');
  this.prefix = this.config.name + '_';
  this.hasData = this.config.components.hasOwnProperty('data');
  this.dataCname = this.hasData ? this.prefix + 'data' : null;

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
    if (component.build) {
      component.src = path.resolve(component.src);
    }
  });

  // Load plugins
  this.plugins = {};
  if (this.config.plugins) {
    for (var x in this.config.plugins) {
      var name = this.config.plugins[x];
      this.plugins[name] = require(path.resolve(config.pluginDir, name))(this);
    }
  }

  /**
   * Initialize the app by creating & starting the Docker containers.
   */
  this.init = function() {
    _this.emit('pre-init');
    _this.emit('pre-create');
    var components = _.toArray(_.cloneDeep(_this.config.components));
    async.mapSeries(components, createContainer, function(err, result) {
      _this.emit('post-create');
      _this.emit('post-init');
    });
      /*
      _this.emit('pre-start');
      async.mapSeries(components, startContainer, function(err, result) {
        _this.emit('post-start');
        _this.emit('post-init');
      });
      */

  };

  /**
   * Creates the container of a specific component.
   *
   * @param component
   * @param done
   */
  var createContainer = function(component, done) {
    _this.emit('pre-create-component', component);
    docker.createContainer({
      Hostname: component.hostname,
      name: component.cname,
      Image: component.image,
      Dns: ['8.8.8.8', '8.8.4.4'],
      Env: ['APPNAME='+_this.appname, 'APPDOMAIN='+_this.appdomain]
    }, function(err, container) {
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
    var links = [];
    for (var x in _this.config.components) {
      var c = _this.config.components[x];
      if (component.key == c.key) {
        continue;
      }
      links.push(c.cname + ':' + c.key);
    }
    docker.getContainer(component.cid).start({
      Hostname: component.hostname,
      PublishAllPorts: true,
      VolumesFrom: component.dataCname,
      Env: ['APPNAME='+_this.appname]
      //Links: links
    }, function(err, data) {
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

util.inherits(App, EventEmitter);
module.exports = App;

/*
var checkCreateContainer = function(obj, cb) {
  if (fs.existsSync(obj.cidfile)) {
    // if the file exists, verify the container exists
    var container = docker.getContainer(fs.readFileSync(obj.cidfile));
    container.inspect(function(err, data) {
      // remove the file if the container doesn't exist
      if (err) {
        fs.unlinkSync(obj.cidfile);
        createContainer(obj, cb);
      }
    });
  }
  else {
    createContainer(obj, cb);
  }
  console.log(obj.key, ' end of check');
};
*/

/*

var createContainer = function(obj, cb) {
  var self = this;
  _this.emit('pre-create-component', self, obj);
  docker.createContainer({
    Hostname: obj.cname,
    name: obj.cname,
    Image: obj.image,
    Dns: ['8.8.8.8', '8.8.4.4']
  }, function(err, container) {
    if (container) {
      var fs = require('fs');
      fs.writeFileSync(path.resolve(obj.cidfile), container.id);
      obj.cid = container.id;
      console.log(obj.key, 'created');
      _this.emit('post-create-component', self, obj);
      cb();
    }
  });
};

var setProxy = function(obj, cb) {
  // Setup the hipache proxy via redis
  if (obj.proxy) {
    var c = docker.getContainer(obj.cid);

    c.inspect(function(err, data2) {
      for (var x in obj.proxy) {
        var proxy = obj.proxy[x];
        var client = redis.createClient(config.redis.port, config.redis.host);
        var hostname = proxy.default ? obj.app.hostname : obj.hostname;
        var rkey = 'frontend:' + hostname;

        if (data2 && data2.NetworkSettings.Ports[proxy.port]) {
          var port = data2.NetworkSettings.Ports[proxy.port][0].HostPort;

          client.multi()
            .del(rkey)
            .rpush(rkey, obj.cname)
            .rpush(rkey, config.host + ':' + port)
            .exec(function (err, replies) {
              if (err) throw err;
              cb();
              client.quit();
            });
        }
      }
    });
  }
};

var startContainer = function(obj, cb) {
  var self = this;
  _this.emit('pre-start-component', self, obj);

  var links = [];
  for (var x in obj.app.config.components) {
    var component = obj.app.config.components[x];
    if (obj.key == component.key) {
      continue;
    }
    links.push(component.cname + ':' + component.key);
  }

  console.log(links);

  docker.getContainer(obj.cid).start({
    PublishAllPorts: true,
    VolumesFrom: obj.dataCname,
    Links: links
  }, function(err, data) {
    console.log(obj.key, 'started');
    _this.emit('post-start-component', self, obj);
    cb();
  });
};

var stopContainer = function(obj) {
  var self = this;
  _this.emit('pre-stop-component', self, obj);

  docker.getContainer(obj.cid).stop(function(err, data) {
    _this.emit('post-stop-component', self, obj);
  });
};

var restartContainer = function(obj) {
  var self = this;
  _this.emit('pre-restart-component', self, obj);

  docker.getContainer(obj.cid).stop(function(err, data) {
    docker.getContainer(obj.cid).start(function(err, data) {
      _this.emit('post-restart-component', self, obj);
    });
  });
};

var killContainer = function(obj) {
  var self = this;
  _this.emit('pre-kill-component', self, obj);

  docker.getContainer(obj.cid).kill(function(err, data) {
    _this.emit('post-kill-component', self, obj);
  });
};

var removeContainer = function(obj) {
  var self = this;
  _this.emit('pre-remove-component', self, obj);
  //setProxy(obj, true);
  docker.getContainer(obj.cid).remove(function(err, data) {
    if (!err && fs.existsSync(obj.cidfile)) {
      fs.unlinkSync(obj.cidfile);

      _this.emit('post-remove-component', self, obj);
    }
  });
};

var pullImage = function(obj, components, deferred) {
  var self = this;
  _this.emit('pre-pull-component', self, obj);

  console.log('pulling ' + obj.image);

  docker.pull(obj.image, function (err, stream) {
    if (err) {
      throw err;
    }

    stream.on('data', function(data) {
      // this is needed?
    });

    stream.on('end', function() {
      obj.pulled = true;
      console.log(obj.image + ' pull complete.');
      _this.emit('post-pull-component', self, obj);

      if (_.every(components, {'pulled': true})) {
        _(components).each(function(obj) {
          delete obj.pulled;
        });

        deferred.resolve();
      }

    });
  });
};

var buildImage = function(obj, components, deferred) {
  _this.emit('pre-build-component', self, obj);
  console.log('building ' + obj.image);

  var filename = obj.key + '.tar';
  var file = path.resolve(obj.src, filename);

  try {
    console.log(obj.src);
    process.chdir(obj.src);
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
    docker.buildImage(data, {t: obj.image}, function (err, stream){
      if (err) {
        throw err;
      }

      stream.on('data', function(data) {
        // this is needed?
      });

      stream.on('end', function() {
        fs.unlinkSync(file);
        process.chdir(baseDir);

        obj.built = true;
        console.log(obj.image + ' build complete.');
        _this.emit('post-build-component', self, obj);

        if (_.every(components, {'built': true, 'build': true})) {
          _(components).each(function(obj) {
            delete obj.built;
          });
          deferred.resolve();
        }
      });
    });
  });
};

*/

