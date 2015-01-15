/**
 * Module to wrap and abstract access to boot2docker.
 * @module b2d
 */

'use strict';

var B2D_EXECUTABLE = 'boot2docker';

var core = require('../../core.js');
var events = core.events;
var fs = require('fs');
var path = require('path');

var execShellCommand = function(cmd, callback) {
  core.deps.call(function(shell) {
    shell.exec(cmd, callback);
  });
};

var getProfile = function() {
  return path.join(core.deps.lookup('config').sysConfRoot, 'b2d.profile');
};

var setProfile = function(callback) {
  core.env.setB2dProf(getProfile());
  callback();
};

var execCommand = function(cmd, callback) {
  setProfile(function() {
    execShellCommand([B2D_EXECUTABLE, cmd].join(' '), callback);
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

var recursiveTry = function(cmd, tries, callback) {
  var rec = function(tries) {
    execCommand(cmd, function(err, output) {
      if (err && tries === 0) {
        callback(err);
      } else if (err) {
        rec(--tries);
      } else {
        events.emit('post-' + cmd, null, function() {
          callback(null, removeTrailingNewline(output));
        });
      }
    });
  };
  events.emit('pre-' + cmd, null, function() {
    rec(tries);
  });
};

var up = function(callback) {
  recursiveTry('init', 3, function(err, output) {
    if (err) {
      callback(err, output);
    } else {
      recursiveTry('up', 3, callback);
    }
  });
};

var down = function(callback) {
  recursiveTry('down', 3, callback);
};

var getStatus = function(callback) {
  recursiveTry('status', 3, callback);
};

var getIp = function(callback) {
  recursiveTry('ip', 3, callback);
};

var isUp = function(callback) {
  getStatus(function(err, status) {
    if (err) {
      callback(err);
    } else if (status === 'running') {
      callback(null, true);
    } else {
      callback(null, false);
    }
  });
};

var isDown = function(callback) {
  isUp(function(err, isUp) {
    if (err) {
      callback(err);
    } else {
      callback(null, !isUp);
    }
  });
};

var hasProfile = function(callback) {
  if (fs.existsSync(getProfile())) {
    callback(true);
  } else {
    callback(false);
  }
};

var isInstalled = function(callback) {
  // @todo: installer should set a uuid file from boot2docker info and then
  // run 'boot2docker info' and compare the UUID key with the uuid file.
  var cmd = ['which', B2D_EXECUTABLE].join(' ');
  execShellCommand(cmd, function(err, output) {
    if (!err && output) {
      hasProfile(function(profile) {
        if (profile) {
          callback(null, true);
        }
        else {
          // @todo: probably want to create an error to pass back here
          callback(null, false);
        }
      });
    } else if (err && !output) {
      callback(null, false);
    } else {
      callback(err, false);
    }
  });
};

var engineConfig = function(callback) {
  getIp(function(err, output) {
    if (err) {
      callback(err, null);
    }
    else {
      var config = {
        protocol: 'http',
        host: output,
        port: '2375'
      };
      callback(null, config);
    }
  });
};

var getName = function(callback) {
  var provider = 'boot2docker';
  callback(provider);
};

var hasTasks = function(callback) {
  callback(true);
};

exports.init = function(intf) {
  intf.getName = getName;
  intf.up = up;
  intf.down = down;
  intf.isInstalled = isInstalled;
  intf.isUp = isUp;
  intf.isDown = isDown;
  intf.hasTasks = hasTasks;
  intf.engineConfig = engineConfig;
  return intf;
};
