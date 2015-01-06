'use strict';

/*
 *  Kalabox lib -> engine -> docker module.
 */

var docker = null;

exports.init = function(dockerInterface) {
  docker = dockerInterface;
};

exports.teardown = function() {
  docker = null;
};

var get = function(cid) {
  return docker.getContainer(cid);
};
exports.get = get;

var applyOpt = function(object, op, args) {
  var fn = object[op];
  fn.apply(object, args);
};
exports.applyOpt = applyOpt;

var getDefaultArgs = function(callback) {
  var args = [
    callback 
  ];
  return args;
};

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

var toGenericContainer = function(dockerContainer) {
  var dockerContainerName = dockerContainer.Names[0].substr(1);
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
  docker.listContainers(null, function(err, dockerContainers) {
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

exports.start = function(cid, startOptions, callback) {
  var args = getDefaultArgs(callback);
  arg.sunshift(startOptions);
  dockerOpt(get(cid), 'start', args);
};

exports.stop = function(cid, callback) {
  applyOpt(get(cid), 'stop', getDefaultArgs(callback));
};

exports.remove = function(cid, callback) {
  applyOpt(get(cid), 'remove', getDefaultArgs(callback));
};
