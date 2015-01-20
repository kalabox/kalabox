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
var fileinput = require('fileinput');
var S = require('string');

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

var b2dprofile = null;
var parseProfile = function(callback) {
  if (b2dprofile) {
    callback(b2dprofile);
  }
  var profile = {};
  var b2dProfileFile = new fileinput.FileInput([getProfile()]);
  b2dProfileFile
    .on('line', function(line) {
      var current = S(line.toString('utf8')).trim().s;
      if (!S(current).startsWith('#') && !S(current).isEmpty()) {
        if (S(current).include('=')) {
          var pieces = current.split('=');
          profile[S(pieces[0]).trim().s] = S(pieces[1]).trim().s;
        }
      }
    })
    .on('end', function() {
      callback(profile);
    });
};
exports.parseProfile = parseProfile;

var execCommand = function(cmd, callback) {
  // @todo: eventually we probably want this to handle options?
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
      recursiveTry('up', 3, function(err, output) {
        if (err) {
          callback(err, output);
        }
        else {
          parseProfile(function(profile) {
            var hostIP = profile.HostIP;
            var cmd = ['sudo mount -t nfs', [hostIP, core.deps.lookup('config').codeRoot].join(':'), '/kalabox/code'].join(' ');
            recursiveTry('ssh "' + cmd + '"', 3, callback);
          });
        }
      });
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

var engineConfig = null;
var getEngineConfig = function(callback) {
  if (engineConfig) {
    callback(null, engineConfig);
  }
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
      core.deps.register('engineConfig', config);
      callback(null, config);
    }
  });
};

var hasTasks = function(callback) {
  callback(true);
};

var getServerIps = function(callback) {
  parseProfile(function(profile) {
    var upper = profile.UpperIP.replace(/"/g, '').split('.');
    var lower = profile.LowerIP.replace(/"/g, '').split('.');
    var ips = [];
    var top = upper.pop();
    var bottom = lower.pop();
    var prefix = upper.join('.');
    for (var i = bottom; i <= top; i++) {
      ips.push([prefix, i].join('.'));
    }
    callback(ips);
  });
};
exports.getServerIps = getServerIps;

var checkExports = function(path, exportLine, callback) {
  var exportsFile = new fileinput.FileInput([path]);
  var found = false;
  exportsFile
    .on('line', function(line) {
      if (line.toString('utf8').indexOf(exportLine) > -1) {
        found = true;
      }
    })
    .on('end', function() {
      callback(found);
    });
};
exports.checkExports = checkExports;

exports.init = function(intf) {
  intf.up = up;
  intf.down = down;
  intf.isInstalled = isInstalled;
  intf.isUp = isUp;
  intf.isDown = isDown;
  intf.hasTasks = hasTasks;
  intf.engineConfig = getEngineConfig;
  return intf;
};

exports.name = 'boot2docker';
