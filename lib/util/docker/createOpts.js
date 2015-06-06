'use strict';

// @todo: @bcauldwell - Finish.

var _ = require('lodash');
var util = require('util');

function CreateOpts(name) {

  this.obj = {
    name: name,
    Binds: [],
    Env: [],
    HostConfig: {
      NetworkMode: 'bridge',
      PortBindings: {}
    }
  };

}

CreateOpts.prototype.json = function() {

  return this.obj;

};

CreateOpts.prototype.command = function(cmd) {

  this.obj.Cmd = cmd;

  return this;

};

CreateOpts.prototype.exposePort = function(port) {

  this.obj.ExposedPorts.port = {};

  return this;

};

CreateOpts.prototype.port = function(rawPort, hostPort) {

  var parts = rawPort.split('/');

  var portNumber = parts[0];
  var protocol = parts[1] || 'tcp';
  var port = util.format('%s/%s', portNumber, protocol);
  hostPort = hostPort || '';

  // @todo: @bcauldwell - Grab provider IP.
  this.obj.HostConfig.PortBindings[port] = [{
    'HostIp': '',
    'HostPort': hostPort
  }];

  return this;

};

CreateOpts.prototype.env = function(key, val) {

  this.obj.Env.push(util.format('%s=%s', key, val));

  return this;

};

CreateOpts.prototype.bind = function(filepath) {

  this.obj.Binds.push(filepath);

  return this;

};
