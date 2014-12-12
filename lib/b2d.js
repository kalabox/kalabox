/**
 * Module to wrap and abstract access to boot2docker.
 * @module b2d
 */

'use strict';

var EventEmitter = require('events').EventEmitter;
var events = new EventEmitter();
module.exports.events = events;

var fs = require('fs');
var deps = require('./deps.js');
var kenv = require('./kEnv.js');

var B2D_EXECUTABLE = 'boot2docker';

function getShell() {
  return deps.lookup('shell');
}

var isInstalled = function(callback) {
  var cmd = 'which boot2docker';
  getShell().exec(cmd, function(err, output) {
    if (!err && output) {
      callback(err, true);
    } else if (err && !output) {
      callback(null, false);
    } else {
      callback(err, false);
    }
  });
};
module.exports.isInstalled = isInstalled;

function verifyB2dInstalled(callback) {
  isInstalled(function(err, isIntalled) {
    if (err) {
      throw err;
    } else if (!isInstalled) {
      throw new Error('Boot2docker is NOT installed!');
    } else {
      callback();
    }
  });
}

function verifyProfile(callback) {
  var B2D_PROFILE = deps.lookup('config').sysConfRoot + '/b2d.profile';
  if (fs.existsSync(B2D_PROFILE)) {
    kenv.setB2dProf(B2D_PROFILE);
    callback();
  } else {
    throw new Error('You need a Boot2Docker profile. Try kbox install!');
  }
}

function execB2dCommand(cmd, callback) {
  verifyB2dInstalled(function() {
    verifyProfile(function() {
      _execB2dCommand(cmd, callback)
    });
  });
}

function _execB2dCommand(cmd, callback) {
  getShell().exec(B2D_EXECUTABLE + ' ' + cmd, function(err, output) {
    if (err) {
      if (callback) {
        callback(err, output);
      }
      else {
        throw err;
      }
    } else {
      callback(err, output);
    }
  });
}

/**
 * Stops VM.
 * @arg {function} callback - Callback function called on completion
 * @example
 * var b2d = require(...);
 * b2d.down(function() {
 *   console.log('VM stopped!');
 * });
 */
var down = function(b2d, callback, attempts) {
  b2d.events.emit('pre-down');
  execB2dCommand('down', function(err, output) {
    if (err && attempts === 0) {
      throw err;
    }
    else if (err && attempts > 0) {
      --attempts;
      down(b2d, callback, attempts);
    }
    else {
      b2d.events.emit('post-down');
      callback();
    }
  });
};
module.exports.down = down;

/**
 * Starts VM.
 * @arg {function} callback - Callback function called on completion
 * @example
 * var b2d = require(...);
 * b2d.up(function() {
 *   console.log('VM is now running!');
 * });
 */
var up = function(b2d, callback, attempts) {
  b2d.events.emit('pre-up');
  execB2dCommand('up', function(err, output) {
    if (err && attempts === 0) {
      throw err;
    }
    else if (err && attempts > 0) {
      --attempts;
      up(b2d, callback, attempts);
    }
    else {
      b2d.events.emit('post-up');
      callback();
    }
  });
}
module.exports.up = up;

function removeTrailing(src, s) {
  var end = src.substr(src.length - s.length, s.length);
  if (end === s) {
    return src.substr(0, src.length - s.length);
  } else {
    return src;
  }
}

function removeTrailingNewline(src) {
  return removeTrailing(src, '\n');
}

/**
 * Queries boot2docker for VM host's status.
 * @arg {function} callback - Callback function called on completion
 * @returns {string} status - Status of VM host
 * @example
 * var b2d = require(...);
 * b2d.status(function(status) {
 *   if (status !== 'running') {
 *     console.log('status: ' + status);
 *   }
 * });
 */
module.exports.status = function(callback) {
  execB2dCommand('status', function(err, output) {
    if (err) {
      throw err;
    }
    else {
      var status = removeTrailingNewline(output);
      // @todo: debug remove
      callback(status);
    }
  });
};

/**
 * Queries boot2docker for VM host's IP address.
 * @arg {function} callback - Callback function called on completion
 * @returns {string} ip - IP address
 * @example
 * var b2d = require(...);
 * b2d.ip(function(err, ip) {
 *   console.log('IP address: ' + ip);
 * });
 */
module.exports.ip = function(callback) {
  execB2dCommand('ip', function(err, output) {
    var matches = output.match('IP address is: [\n]*(.*)');
    if (matches && matches[1]) {
      callback(null, matches[1]);
    } else {
      callback(err, output);
    }
  });
};

/**
 * Initializes the Boot2docker VM with the users profile config
 * @arg {function} callback - Callback function called on completion
 * @example
 * var b2d = require(...);
 * b2d.init(function(err, init) {
 * });
 */
module.exports.init = function(callback) {
  execB2dCommand('init', function(err, output) {
    // @todo: everything
  });
};
