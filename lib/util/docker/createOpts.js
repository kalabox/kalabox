'use strict';

// @todo: @bcauldwell - Finish.

var _ = require('lodash');
var util = require('util');
var pp = util.inspect;

/*
 * Constructor.
 */
function CreateOpts(name) {

  if (this instanceof CreateOpts) {

    // Normal constructor.
    this.state = {
      name: name,
      Binds: [],
      Env: [],
      HostConfig: {
        NetworkMode: 'bridge',
        PortBindings: {},
        VolumesFrom: []
      }
    };

  } else {

    // Constructor was called without the new operator.
    return new CreateOpts(name);

  }

}

/*
 * Static method for invoking constructor.
 */
CreateOpts.instance = function() {

  return new CreateOpts();

};

/*
 * Static way to create a new empty create options object.
 */
CreateOpts.empty = function() {
  return CreateOpts.instance();
};

/*
 * Returns the monad's internal state.
 */
CreateOpts.prototype.json = function() {

  return this.state;

};

CreateOpts.prototype.command = function(cmd) {

  this.state.Cmd = cmd;

  return this;

};
CreateOpts.command = function(cmd) {
  return CreateOpts.instance().command(cmd);
};

CreateOpts.prototype.image = function(image) {

  this.state.Image = image;

  return this;

};
CreateOpts.image = function(image) {
  return CreateOpts.instance().image(image);
};

CreateOpts.prototype.port = function(rawPort, hostPort) {

  var parts = rawPort.split('/');

  var portNumber = parts[0];
  var protocol = parts[1] || 'tcp';
  var port = util.format('%s/%s', portNumber, protocol);
  hostPort = hostPort || '';

  // @todo: @bcauldwell - Grab provider IP.
  this.state.HostConfig.PortBindings[port] = [{
    'HostIp': '',
    'HostPort': hostPort
  }];

  return this;

};
CreateOpts.port = function(rawPort, hostPort) {
  return CreateOpts.instance().port(rawPort, hostPort);
};

/*
 * Add environmental variable.
 */
CreateOpts.prototype.env = function(key, val) {

  // Format key val into environmental variable mapping string.
  var envString = util.format('%s=%s', key, val);

  // Add to list of environmental variables.
  this.state.Env.push(envString);

  return this;

};
CreateOpts.env = function(key, val) {
  return CreateOpts.instance().env(key, val);
};

/*
 * Set entry point.
 */
CreateOpts.prototype.entryPoint = function(cmd) {

  // Validate entry point is either a string or an array.
  if (!_.isArray(cmd) && !_.isString(cmd)) {
    throw new Error('Invalid entry point: ' + pp(cmd));
  }

  // Set entry point.
  this.state.EntryPoint = cmd;

  return this;

};
CreateOpts.entryPoint = function(cmd) {
  return CreateOpts.instance().entryPoint(cmd);
};

/*
 * Add a volume bind.
 */
CreateOpts.prototype.bind = function(hostPath, containerPath, opts) {

  // Default options.
  opts = opts || {readonly: false};

  // Validate arguments.
  if (typeof hostPath !== 'string') {
    throw new Error('Invalid bind host path: ' + pp(hostPath));
  }
  if (containerPath && typeof containerPath !== 'string') {
    throw new Error('Invalid bind container path: ' + pp(containerPath));
  }
  if (typeof opts !== 'object') {
    throw new Error('Invalid bind options: ' + pp(opts));
  }

  // Build argument list.
  var args = _.filter([hostPath, containerPath], _.identity);

  // If both host path and container path are specified, and readonly option
  // is set to true, add 'ro' suffix.
  if (args.length === 2 && opts.readonly) {
    args.push('ro');
  }

  // Convert array to string.
  var bindString = args.join(':');

  // Add bing string to list of binds.
  this.state.Binds.push(bindString);

  return this;

};
CreateOpts.bind = function(hostPath, containerPath, opts) {
  return CreateOpts.instance().bind(hostPath, containerPath, opts);
};

/*
 * Add volumes from another container.
 */
CreateOpts.prototype.volumeFrom = function(containerName, opts) {

  // Default options.
  opts = opts || {readonly: false};

  // Add container name to list of args.
  var args = [containerName];

  // If readonly is true add to list of args.
  if (opts.readonly) {
    args.push('ro');
  }

  // Convert list of args to a string.
  var volumeFromString = args.join(':');

  // Add to list of volumes from.
  this.state.HostConfig.VolumesFrom.push(volumeFromString);

  return this;

};
CreateOpts.volumeFrom = function(containerName, opts) {
  return CreateOpts.instance().volumeFrom(containerName, opts);
};

/*
 * Set the working directory of the container's command.
 */
CreateOpts.prototype.workingDir = function(workingDir) {

  this.state.WorkingDir = workingDir;

  return this;

};
CreateOpts.workingDir = function(workingDir) {
  return CreateOpts.instance().workingDir(workingDir);
};

module.exports = CreateOpts;
