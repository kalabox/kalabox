/**
 * Module to wrap and abstract access to boot2docker.
 * @module b2d
 */

'use strict';

var deps = require('./deps.js');

var B2D_EXECUTABLE = 'boot2docker';

var shell = null;

function getShell() {
  if (shell === null) {
    shell = deps.lookup('shell');
  }
  return shell;
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

function execB2dCommand(cmd, callback) {
  verifyB2dInstalled(function() {
    getShell().exec(B2D_EXECUTABLE + ' ' + cmd, function(err, output) {
      if (err) {
        throw err;
      } else {
        callback(output);
      }
    });
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
module.exports.down = function(callback) {
  execB2dCommand('down', function(output) {
    console.log(output);
    callback();
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
module.exports.up = function(callback) {
  execB2dCommand('up', function(output) {
    console.log(output);
    callback();
  });
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
module.exports.status = function(callback) {
  execB2dCommand('status', function(output) {
    var status = removeTrailingNewline(output);
    callback(status);
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
  execB2dCommand('ip', function(output) {
    var matches = output.match('IP address is: [\n]*(.*)');
    if (matches && matches[1]) {
      callback(null, matches[1]);
    } else {
      var err = new Error(output);
      callback(err, output);
    }
  });
};
