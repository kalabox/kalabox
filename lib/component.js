'use strict';

var fs = require('fs');
var _path = require('path');

var _ = require('lodash');

var config = require('./config.js');
var container = require('./container.js');
var _util = require('./util.js');

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
  this.dataCname = 'kb_' + app.hasData && key !== 'data' ? app.dataCname : null;
  this.cname = ['kb', app.name, key].join('_');
  this.cidfile = _path.join(app.config.appCidsRoot, key);

  if (fs.existsSync(this.cidfile)) {
    this.cid = fs.readFileSync(this.cidfile, 'utf8');
  }

  // set component build source to which ever valid path is found first:
  if (self.image.build) {
    var pathsToSearch = [
      app.config.appRoot,
      app.config.srcRoot
    ].map(function(dir) {
      return _path.join(dir, self.image.src, 'Dockerfile');
    });
    var path = _util.searchForPath(pathsToSearch);
    if (path === null) {
      self.image.build = false;
    } else {
      self.image.src = path;
    }
  }
};

exports.create = function(component, callback) {
  component.app.event('pre-init-component', component);
  container.create(component, function(err, data) {
    component.app.event('post-init-component', component);
    callback(err, data);
  });
};

exports.start = function(component, callback) {
  component.app.event('pre-start-component', component);
  container.start(component, function(err, data) {
    component.app.event('post-start-component', component);
    callback(err, data);
  });
};

exports.stop = function(component, callback) {
  component.app.event('pre-stop-component', component);
  container.stop(component, function(err, data) {
    component.app.event('post-stop-component', component);
    callback(err, data);
  });
};

exports.kill = function(component, callback) {
  component.app.event('pre-kill-component', component);
  container.kill(component, function(err, data) {
    component.app.event('post-kill-component', component);
    callback(err, data);
  });
};

exports.remove = function(component, callback) {
  component.app.event('pre-remove-component', component);
  container.remove(component, function(err, data) {
    component.app.event('post-remove-component', component);
    callback(err, data);
  });
};
