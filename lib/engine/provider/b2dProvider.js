'use strict';

var B2D_EXECUTABLE = 'boot2docker';

var core = require('../../core.js');

var execShellCommand = function(cmd, callback) {
  core.deps.call(function(shell) {
    shell.exec(cmd, callback);
  });
};

var execCommand = function(cmd, callback) {
  execShellCommand([B2D_EXECUTABLE, cmd].join(' '), callback);
};

var recursiveTry = function(cmd, tries, callback) {
  var rec = function(tries) {
    execCommand(cmd, function(err, output) {
      if (err && tries === 0) {
        callback(err);
      } else if (err) {
        rec(--tries);
      } else {
        callback(null, output);
      }
    });
  };
  rec(tries);
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

var isInstalled = function(callback) {
  // @todo: run 'boot2docker info' and compare UUID.
  var cmd = ['which', B2D_EXECUTABLE].join(' ');
  execShellCommand(cmd, function(err, output) {
    if (!err && output) {
      callback(null, true);
    } else if (err && !output) {
      callback(null, false);
    } else {
      callback(err, false);
    }
  });
};

// @todo: hasProfile

exports.init = function(intf) {
  intf.up = up;
  intf.down = down;
  intf.isInstalled = isInstalled;
  intf.isUp = isUp;
  intf.isDown = isDown;
  return intf;
};

exports.name = 'boot2docker';
