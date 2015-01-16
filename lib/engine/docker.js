'use strict';

/**
 * Kalabox lib -> engine -> docker module.
 * @module docker
 */

var async = require('async');
var core = require('../core.js');
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Dockerode = require('dockerode');
var S = require('string');

var docker = null;
var dockerConfig = null;

exports.init = function(engineConfig) {
  dockerConfig = engineConfig;
  docker = new Dockerode(dockerConfig);
};

exports.teardown = function() {
  docker = null;
};

var get = function(cid) {
  return docker.getContainer(cid);
};
exports.get = get;

exports.getProviderModule = function() {
  // @todo: Change this to check platform.
  return require('./provider/b2d.js');
};

var inspect = function(container, callback) {
  container.inspect(callback);
};
exports.inspect = inspect;

var parseDockerContainerName = function(dockerContainerName) {
  var parts = dockerContainerName.split('_');
  if (parts.length !== 3) {
    return null;
  } else if (parts[0] !== 'kb') {
    return null;
  } else {
    return {
      prefix: parts[0],
      app: parts[1],
      name: parts[2]
    };
  }
};

var charsToRemove = ['/', ' '];
var cleanupDockerContainerName = function(name) {
  var str = S(name);
  var charToRemove = _.find(charsToRemove, function(char) { return str.startsWith(char); });
  if (charToRemove === undefined) {
    return name;
  } else {
    return str.chompLeft(charToRemove).s;
  }
};

var toGenericContainer = function(dockerContainer) {
  var dockerContainerName = cleanupDockerContainerName(dockerContainer.Names[0]);
  var parsedName = parseDockerContainerName(dockerContainerName);
  if (parsedName === null) {
    return null;
  } else {
    return {
      id: dockerContainer.Id,
      name: dockerContainerName,
      app: parsedName.app
    };
  }
};

exports.list = function(appName, callback) {
  if (callback === undefined && typeof appName === 'function') {
    callback = appName;
    appName = null;
  }
  docker.listContainers({all: 1}, function(err, dockerContainers) {
    if (err) {
      callback(err, []);
    } else {
      var containers = dockerContainers.map(function(container) {
        return toGenericContainer(container);
      }).filter(function(container) {
        if (container === null) {
          return false;
        } else if (appName !== null) {
          return container.app === appName;
        } else {
          return true;
        }
      });
      callback(null, containers);
    }
  });
};

exports.create = function(createOptions, callback) {
  console.log('createOptions: ' + JSON.stringify(createOptions));
  docker.createContainer(createOptions, function(err, data) {
    var container = {};
    if (data) {
      if (createOptions.name) {
        container = {
          cid: data.id,
          name: createOptions.name
        };
      }
    }
    callback(err, container);
  });
};

exports.start = function(cid, startOptions, callback) {
  if (typeof startOptions === 'function' && callback === undefined) {
    callback = startOptions;
    startOptions = {};
  }
  var container = get(cid);
  inspect(container, function(err, data) {
    if (err) {
      callback(err);
    } else if (data.State.Running) {
      callback(null);
    } else {
      console.log('starting: ' + cid);
      container.start(startOptions, callback);
    }
  });
};

exports.stop = function(cid, callback) {
  var container = get(cid);
  inspect(container, function(err, data) {
    if (err) {
      callback(err);
    } else if (!data.State.Running) {
      callback(null);
    } else {
      console.log('stopping: ' + cid);
      container.stop(callback);
    }
  });
};

exports.remove = function(cid, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  if (!opts.kill) {
    opts.kill = false;
  }
  var container = get(cid);
  inspect(container, function(err, data) {
    if (err) {
      callback(err);
    } else if (!data.State.Running) {
      container.remove(callback);
    } else if (data.State.Running && opts.kill) {
      container.stop(function(err) {
        if (err) {
          callback(err);
        } else {
          container.remove(callback);
        }
      });
    } else {
      callback(new Error('The container "' + cid + '" can NOT be removed, it is still running.'));
    }
  });
};

var parseDockerStream = function(data) {
  var parsedData;
  try {
    parsedData = JSON.parse(data.toString());
  } catch (err) {
    // do nothing
  }
  console.log(parsedData);
  if (parsedData) {
    for (var x in parsedData) {
      if (x.toLowerCase() === 'errordetail') {
        return new Error(parsedData[x].message);
      }
    }
  }
};

exports.build = function(image, callback) {
  console.log('Building', image.name);
  var workingDir = path.dirname(image.src);
  var filename = 'archive.tar';
  var file = path.resolve(workingDir, filename);

  try {
    process.chdir(workingDir);
  }
  catch (err) {
    throw err;
  }

  // Need a solution for windows
  // Maybe we can we pipe the directory with something like this:
  // process.stdin.pipe(zlib.createGunzip()).pipe(fs.createWriteStream(file));
  exec('tar -cvf ' + file + ' *', function(err, stdout, stderr) {
    if (err) {
      throw err;
    }
    var data = fs.createReadStream(file);
    docker.buildImage(data, {t: image.name}, function(err, stream) {
      if (err) {
        throw err;
      }
      var error = null;
      stream.on('data', function(data) {
        // seems like this listener is required for this to work.
        var parsedError = parseDockerStream(data);
        if (parsedError && !error) {
          error = parsedError;
        }
      });
      stream.on('end', function() {
        fs.unlinkSync(file);
        core.deps.call(function(globalConfig) {
          process.chdir(globalConfig.srcRoot);
        });
        console.log(image.name, 'complete');
        callback(error, undefined);
      });
    });
  });
};

var pull = function(image, callback) {
  // @todo: do we really need this output to console?
  console.log('Pulling', image.name);
  docker.pull(image.name, function(err, stream) {
    if (err) {
      throw err;
    }
    var error = null;
    stream.on('data', function(data) {
      var parsedError = parseDockerStream(data);
      if (parsedError && !error) {
        error = parsedError;
      }
    });
    stream.on('end', function() {
      // @todo: do we really need this output to console?
      console.log(image.name, 'complete');
      callback(error);
    });
  });
};
exports.pull = pull;
