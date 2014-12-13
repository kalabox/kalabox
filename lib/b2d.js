/**
 * Module to wrap and abstract access to boot2docker.
 * @module b2d
 */

'use strict';

var EventEmitter = require('events').EventEmitter;
var events = new EventEmitter();
module.exports.events = events;

var fs = require('fs');
var path = require('path');
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

var hasProfile = function(callback) {
  var B2D_PROFILE = path.join(deps.lookup('config').sysConfRoot, '/b2d.profile');
  if (fs.existsSync(B2D_PROFILE)) {
    kenv.setB2dProf(B2D_PROFILE);
    callback(true);
  } else {
    callback(false);
  }
};
module.exports.hasProfile = hasProfile;

function verifyB2dProfile(callback) {
  hasProfile(function(hasProfile) {
    if (hasProfile) {
      callback();
    } else {
      throw new Error('You need a Boot2Docker profile. Try kbox install!');
    }
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

function execB2dCommand(cmd, callback) {
  verifyB2dInstalled(function() {
    verifyB2dProfile(function() {
      _execB2dCommand(cmd, callback);
    });
  });
}

var _down = function(b2d, attempts, callback) {
  execB2dCommand('down', function(err, output) {
    if (err && attempts === 0) {
      throw err;
    }
    else if (err && attempts > 0) {
      _down(b2d, --attempts, callback);
    }
    else {
      b2d.events.emit('post-down');
      callback();
    }
  });
};

/**
 * Stops VM.
 * @arg {function} callback - Callback function called on completion
 * @example
 * var b2d = require(...);
 * b2d.down(function() {
 *   console.log('VM stopped!');
 * });
 */
module.exports.down = function(b2d, attempts, callback) {
  b2d.events.emit('pre-down');
  _down(b2d, attempts, callback);
};

var _up = function(b2d, attempts, callback) {
  execB2dCommand('up', function(err, output) {
    if (err && attempts === 0) {
      throw err;
    }
    else if (err && attempts > 0) {
      _up(b2d, --attempts, callback);
    }
    else {
      b2d.events.emit('post-up');
      callback();
    }
  });
};

/**
 * Starts VM.
 * @arg {function} callback - Callback function called on completion
 * @example
 * var b2d = require(...);
 * b2d.up(function() {
 *   console.log('VM is now running!');
 * });
 */
module.exports.up = function(b2d, attempts, callback) {
  b2d.events.emit('pre-up');
  _up(b2d, attempts, callback);
};

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
var state = function(attempts, callback) {
  execB2dCommand('status', function(err, output) {
    if (err && attempts === 0) {
      throw err;
    }
    else if (err && attempts > 0) {
      --attempts;
      state(attempts, callback);
    }
    else {
      var message = removeTrailingNewline(output);
      // @todo: debug remove
      callback(message);
    }
  });
};
module.exports.state = state;

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
var ip = function(attempts, callback) {
  execB2dCommand('ip', function(err, output) {
    if (err && attempts === 0) {
      throw err;
    }
    else if (err && attempts > 0) {
      --attempts;
      ip(attempts, callback);
    }
    else {
      var matches = output.match('IP address is: [\n]*(.*)');
      if (matches && matches[1]) {
        callback(null, matches[1]);
      } else {
        callback(err, output);
      }
    }
  });
};
module.exports.ip = ip;

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
