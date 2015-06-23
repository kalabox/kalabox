'use strict';

// @todo: @bcauldwell - Finish.

var _ = require('lodash');
var util = require('util');
var format = util.format;
var pp = util.inspect;

/*
 * Constructor.
 */
function StartOpts() {

  if (this instanceof StartOpts) {

    // Normal constructor.
    this.state = {
      Binds: [],
      VolumesFrom: []
    };

  } else {

    // Constructor was called without the new operator.
    return new StartOpts();

  }

}

/*
 * Static method for invoking constructor.
 */
StartOpts.instance = function() {

  return new StartOpts();

};

/*
 * Static way to create a new empty create options object.
 */
StartOpts.empty = function() {
  return StartOpts.instance();
};

/*
 * Returns the monad's internal state.
 */
StartOpts.prototype.json = function() {

  return this.state;

};

/*
 * Add a volume bind.
 */
StartOpts.prototype.bind = function(hostPath, containerPath, opts) {

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
StartOpts.bind = function(hostPath, containerPath, opts) {
  return StartOpts.instance().bind(hostPath, containerPath, opts);
};

/*
 * Add volumes from another container.
 */
StartOpts.prototype.volumeFrom = function(containerName, opts) {

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
  this.state.VolumesFrom.push(volumeFromString);

  return this;

};
StartOpts.volumeFrom = function(containerName, opts) {
  return StartOpts.instance().volumeFrom(containerName, opts);
};

module.exports = StartOpts;
