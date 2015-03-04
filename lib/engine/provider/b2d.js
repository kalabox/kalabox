/**
 * Module to wrap and abstract access to boot2docker.
 * @module b2d
 */

'use strict';

var fs = require('fs');
var core = require('../../core.js');
var _exec = require('child_process').exec;
var events = core.events;
var fs = require('fs');
var path = require('path');
var fileinput = require('fileinput');
var S = require('string');

var B2D_EXECUTABLE = 'boot2docker';
if (process.platform === 'win32') {
  B2D_EXECUTABLE =
    '"C:\\Program Files\\Boot2Docker for Windows\\boot2docker.exe"';
}

var logInfo = core.log.info;
var logDebug = core.log.debug;

var execShellCommand = function(cmd, callback) {
  logDebug('B2D => Executing command.', cmd);
  core.deps.call(function(shell) {
    shell.exec(cmd, function(err, output) {
      if (err) {
        logDebug('B2D => Error running command.', err);
      } else {
        logDebug('B2D => Command results.', output);
      }
      callback(err, output);
    });
  });
};

var getDir = function() {
  return core.deps.lookup('config').sysProviderRoot;
};

var getProfile = function() {
  return path.join(getDir(), 'profile');
};

var setDir = function(callback) {
  core.env.setEnv('BOOT2DOCKER_DIR', getDir());
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

var execCommand = function(cmd, callback) {
  // @todo: eventually we probably want this to handle options?
  setDir(function() {
    if (process.platform === 'win32') {
      core.env.setEnv(
        'Path', process.env.path + ';C:\\Program Files (x86)\\Git\\bin;'
      );
    }
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

var up = function(callbackIn) {
  var callback = function(err, output) {
    if (err) {
      logInfo('B2D => Error while starting up.', err);
    } else {
      logInfo('B2D => Started up.');
    }
    callbackIn(err, output);
  };
  logInfo('B2D => Starting up...');
  recursiveTry('init', 3, function(err, output) {
    if (err) {
      callback(err, output);
    } else {
      // @todo: ewwww gross
      // Manually do the file sharing until this is merged in
      // https://github.com/boot2docker/boot2docker-cli/pull/344
      if (process.platform === 'linux') {
        var shareCmd = 'VBoxManage sharedfolder add "Kalabox2" --name "Users"' +
        ' --hostpath "/home"';
        _exec(shareCmd, function(error, stdout, stderr) {
          // This can fail silently without much hullabaloo
          if (error) {
            logDebug(error);
          }
          recursiveTry('up', 3, callback);
        });
      }
      else {
        recursiveTry('up', 3, callback);
      }
    }
  });
};

var down = function(callback) {
  logInfo('B2D => Shutting down.');
  recursiveTry('down', 3, function(err, output) {
    if (err) {
      logInfo('B2D => Error while shutting down.', err);
    } else {
      logInfo('B2D => Shut down.');
    }
  });
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
  // @todo: on MYSYSGIT which is just a bash script for 'type -p $1' there is
  // probably a cross platform way to do this but for now:
  if (process.platform === 'win32') {
    callback(
      null,
      fs.existsSync(
        'C:\\Program Files\\Boot2Docker for Windows\\boot2docker.exe'
        )
      );
  }
  else {
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
  }

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
      if (!core.deps.contains('engineConfig')) {
        core.deps.register('engineConfig', config);
      }
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

var path2Bind4U = function(path) {
  var bind = path;
  if (process.platform === 'win32') {
    bind = path
      .replace(/\\/g, '/')
      .replace('C:/', 'c:/')
      .replace('c:/', '/c/');
  }
  else if (process.platform === 'linux')  {
    bind = path.replace('/home', '/Users');
  }
  return bind;
};

exports.init = function(intf) {
  intf.up = up;
  intf.down = down;
  intf.isInstalled = isInstalled;
  intf.isUp = isUp;
  intf.isDown = isDown;
  intf.hasTasks = hasTasks;
  intf.engineConfig = getEngineConfig;
  intf.getIp = getIp;
  intf.getServerIps = getServerIps;
  intf.path2Bind4U = path2Bind4U;
  return intf;
};

exports.name = 'boot2docker';
