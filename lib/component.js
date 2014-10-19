'use strict';

var fs = require('fs');
var path = require('path');

var _ = require('lodash');

var config = require('./config.js');
var container = require('./container.js');

exports.Component = function(app, key, component) {
  var _this = this;

  // Copy config
  for (var x in component) {
    this[x] = component[x];
  }

  this.key = key;
  this.app = app;

  // component hostname format: mysite-web.kbox
  // Used when multiple containers may require proxy access
  this.hostname = this.key + '.' + app.appdomain;
  this.url = 'http://' + this.hostname;
  this.dataCname = 'kb_' + app.hasData && key !== 'data' ? app.dataCname : null;
  this.cname = 'kb_' + app.prefix + key;
  this.cidfile = path.resolve(app.cidPath, key);

  if (fs.existsSync(this.cidfile)) {
    this.cid = fs.readFileSync(this.cidfile, 'utf8');
  }

  // set component build source to which ever valid path is found first:
  // 1) relative to .kalabox file, 2) relative to ~/.kalabox, 3) relative to the the Kalabox source
  if (this.image.build) {
    var src = loadPath(app, this.image.src);
    if (src === false) {
      this.image.build = false;
    }
    this.image.src = src;
  }
};

exports.create = function(component, callback) {
  component.app.event('pre-init-component', component);
  container.create(component, function(){
    component.app.event('post-init-component', component);
    callback();
  })
};

exports.start = function(component, callback) {
  component.app.event('pre-start-component', component);
  container.start(component, function(data){
    component.app.event('post-start-component', component);
    callback();
  })
};

exports.stop = function(component, callback) {
  component.app.event('pre-stop-component', component);
  container.stop(component, function(){
    component.app.event('post-stop-component', component);
    callback();
  })
};

exports.kill = function(component, callback) {
  component.app.event('pre-kill-component', component);
  container.kill(component, function(){
    component.app.event('post-kill-component', component);
    callback();
  })
};

exports.remove = function(component, callback) {
  component.app.event('pre-remove-component', component);
  container.remove(component, function(){
    component.app.event('post-remove-component', component);
    callback();
  })
};


/**
 * Fetches a valid path based on a given relative path.
 * - First looks relative to the .kalabox.json file
 * - Second looks relative to the ~/.kalabox directory
 * - Third looks relative to the Kalabox source
 */
var loadPath = function(app, relativePath) {
  var src = path.resolve(app.path, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  src = path.resolve(config.dataPath, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  src = path.resolve(config.baseDir, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  return false;
};

//module.exports = Component;