'use strict';

var fs = require('fs');
var path = require('path');

var _ = require('lodash');

var config = require('../config.js');
var engine = require('../engine.js');
var container = engine.container;
var _util = require('../util.js');

exports.Component = function(app, key, component) {
  var _this = this;
  var self = this;

  // Copy config
  for (var x in component) {
    this[x] = component[x];
  }

  this.key = key;
  this.app = app;

  // component hostname format: mysite-web.kbox
  // Used when multiple containers may require proxy access
  this.hostname = this.key + '.' + app.appDomain;
  this.url = 'http://' + this.hostname;
  this.dataContainerName = this.app.dataContainerName;
  this.cname = ['kb', app.name, key].join('_');
  this.cidfile = path.join(app.config.appCidsRoot, key);

  if (fs.existsSync(this.cidfile)) {
    this.cid = fs.readFileSync(this.cidfile, 'utf8');
  }

  // set component build source to which ever valid path is found first:
  if (self.image.build) {
    var pathsToSearch = [
      app.config.appRoot,
      app.config.srcRoot
    ].map(function(dir) {
      return path.join(dir, self.image.src, 'Dockerfile');
    });
    var rootPath = _util.searchForPath(pathsToSearch);
    if (rootPath === null) {
      self.image.build = false;
    } else {
      self.image.src = rootPath;
    }
  }
};

/**
 * Returns create options for a specific component.
 */
var createOpts = function(component) {
  var dopts = {
    Hostname: component.hostname,
    name: component.cname,
    Image: component.image.name,
    Dns: ['8.8.8.8', '8.8.4.4'],
    Env: ['APPNAME=' + component.app.name, 'APPDOMAIN=' + component.app.appDomain]
  };

  if (component.dataContainerName !== null) {
    dopts.HostConfig = {VolumesFrom:[component.dataContainerName]};
  }

  if (component.createOpts) {
    _(component.createOpts).each(function(opt, key) {
      dopts[key] = opt;
    });
  }

  return dopts;
};
exports.createOpts = createOpts;

/**
 * Returns start options for a specific component.
 */
var startOpts = function(component, opts) {
  var sopts = {
    Hostname: component.hostname,
    PublishAllPorts: true,
    Binds: [component.app.config.appRoot + ':/src:rw'],
    Env: ['APPNAME=' + component.app.name, 'APPDOMAIN=' + component.app.appDomain]
  };

  if (opts) {
    _(opts).each(function(opt, key) {
      sopts[key] = opt;
    });
  }

  return sopts;
};
exports.startOpts = startOpts;

exports.create = function(component, callback) {
  component.app.event('pre-init-component', component);
  var copts = createOpts(component);
  container.create(copts, function(err, data) {
    if (err) {
      throw err;
    }
    if (data) {
      fs.writeFileSync(path.resolve(component.cidfile), data.cid);
    }
    component.app.event('post-init-component', component);
    callback(err, data);
  });
};

exports.start = function(component, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = null;
  }
  component.app.event('pre-start-component', component);
  var sopts = startOpts(component, opts);
  container.start(component.cid, sopts, function(err, data) {
    component.app.event('post-start-component', component);
    callback(err, data);
  });
};

exports.stop = function(component, callback) {
  component.app.event('pre-stop-component', component);
  container.stop(component.cid, function(err, data) {
    component.app.event('post-stop-component', component);
    callback(err, data);
  });
};

exports.kill = function(component, callback) {
  component.app.event('pre-kill-component', component);
  container.kill(component.cid, function(err, data) {
    component.app.event('post-kill-component', component);
    callback(err, data);
  });
};

exports.remove = function(component, callback) {
  component.app.event('pre-remove-component', component);
  container.remove(component.cid, function(err, data) {
    if (!err && fs.existsSync(component.cidfile)) {
      fs.unlinkSync(component.cidfile);
    }
    component.app.event('post-remove-component', component);
    callback(err, data);
  });
};
