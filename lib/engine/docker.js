'use strict';

/**
 * Kalabox lib -> engine -> docker module.
 * @module docker
 */

var async = require('async');
var core = require('../core.js');
var util = require('../util.js');
var shell = util.shell;
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Dockerode = require('dockerode');
var S = require('string');

var docker = null;
var dockerConfig = null;

var logDebug = core.log.debug;
var logInfo = core.log.info;

exports.init = function(engineConfig) {
  logDebug('DOCKER => initializing. ', engineConfig);
  dockerConfig = engineConfig;
  docker = new Dockerode(dockerConfig);
};

exports.teardown = function() {
  docker = null;
};

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
  if (parts.length === 2 && parts[0] === 'kalabox') {
    return {
      prefix: parts[0],
      app: null,
      name: parts[1]
    };
  } else if (parts.length === 3 && parts[0] === 'kb') {
    return {
      prefix: parts[0],
      app: parts[1],
      name: parts[2]
    };
  } else {
    return null;
  }
};

var charsToRemove = ['/', ' '];
var cleanupDockerContainerName = function(name) {
  var str = S(name);
  var charToRemove = _.find(charsToRemove, function(char) {
    return str.startsWith(char);
  });
  if (charToRemove === undefined) {
    return name;
  } else {
    return str.chompLeft(charToRemove).s;
  }
};

var toGenericContainer = function(dockerContainer) {
  var dockerContainerName = cleanupDockerContainerName(
    dockerContainer.Names[0]
  );
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

var list = function(appName, callback) {
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
exports.list = list;

var get = function(searchValue, callback) {
  list(function(err, containers) {
    if (err) {
      callback(err);
    } else {
      var container = _.find(containers, function(container) {
        return container.id === searchValue || container.name === searchValue;
      });
      if (container === undefined) {
        callback(err, null);
      } else {
        callback(err, docker.getContainer(container.id));
      }
    }
  });
};
exports.get = get;

var getEnsure = function(searchValue, action, callback) {
  get(searchValue, function(err, container) {
    if (err) {
      callback(err);
    } else if (!container) {
      callback(new Error(
        'Cannot ' +
        action +
        ' the container "' + searchValue +
        '" it does NOT exist!'));
    } else {
      callback(err, container);
    }
  });
};
exports.getEnsure = getEnsure;

var info = exports.info = function(cid, callback) {
  list(function(err, containers) {
    if (err) {
      callback(err);
    } else {
      var container = _.find(containers, function(container) {
        return container.id === cid || container.name === cid;
      });
      if (container) {
        docker.getContainer(container.id).inspect(function(err, data) {
          if (err) {
            callback(err);
          } else {
            // MixIn ports.
            var ports = data.NetworkSettings.Ports;
            if (ports) {
              container.ports = [];
              _.each(ports, function(port, key) {
                var hostPort = port[0].HostPort;
                if (hostPort) {
                  container.ports.push([key, hostPort].join('=>'));
                }
              });
            }
            // MixIn running state.
            var running = data.State.Running;
            if (running !== undefined) {
              container.running = running;
            }
            callback(null, container);
          }
        });
      } else {
        callback();
      }
    }
  });
};

var containerExists = function(searchValue, callback) {
  get(searchValue, function(err, container) {
    if (err) {
      callback(err);
    } else {
      callback(err, container !== null);
    }
  });
};

exports.create = function(createOptions, callback) {
  logInfo('DOCKER => Creating container.');
  var containerName = createOptions.name;
  containerExists(containerName, function(err, exists) {
    if (err) {
      callback(err);
    } else if (exists) {
      callback(
        new Error(
          'The container "' + containerName + '" already exists!'
        ),
      null);
    } else {
      logDebug('DOCKER => CreateOptions', createOptions);
      //logInfo('createOptions: ' + JSON.stringify(createOptions));
      docker.createContainer(createOptions, function(err, data) {
        if (err) {
          logInfo('DOCKER => Error creating container.', err);
          callback(err);
        } else {
          var container = {};
          if (data) {
            if (createOptions.name) {
              container = {
                cid: data.id,
                name: createOptions.name
              };
            }
          }
          logInfo('DOCKER => Container created.', container);
          callback(err, container);
        }
      });
    }
  });
};

exports.start = function(cid, startOptions, callback) {
  logInfo('DOCKER => Starting container.', cid);
  if (typeof startOptions === 'function' && callback === undefined) {
    callback = startOptions;
    startOptions = {};
  }
  getEnsure(cid, 'start', function(err, container) {
    if (err) {
      callback(err);
    } else {
      inspect(container, function(err, data) {
        if (err) {
          callback(err);
        } else if (data.State.Running) {
          logInfo('DOCKER => Container already started.', cid);
          callback(null);
        } else {
          container.start(startOptions, function(err) {
            if (err) {
              logInfo('DOCKER => Error while starting container.', err);
            } else {
              // @todo: this is a lie, we should be async polling the state
              // here until the state is running.
              logInfo('DOCKER => Container started.', cid);
            }
            callback();
          });
        }
      });
    }
  });
};

// @todo: experimental and needs help
var run = function(image, cmd, streamo, createOptions, startOptions, callback) {
  var callbackInternal = function(err) {
    if (callback) {
      callback(err);
    }
  };
  docker.run(image, cmd, streamo, createOptions, startOptions,
    function(err, data, container) {
      if (err) {
        callbackInternal(err);
      } else {
        // Use another method for this like getEnsure
        docker.getContainer(container.id).remove(function(err, data) {
          callbackInternal(err);
        });
      }
    }
  );
};
exports.run = run;

exports.stop = function(cid, callback) {
  logInfo('DOCKER => Stopping container.', cid);
  getEnsure(cid, 'stop', function(err, container) {
    if (err) {
      callback(err);
    } else {
      inspect(container, function(err, data) {
        if (err) {
          callback(err);
        } else if (!data.State.Running) {
          logInfo('DOCKER => Container already stopped.', cid);
          callback(null);
        } else {
          container.stop(function(err) {
            if (err) {
              logInfo('DOCKER => Error while stopping container.', err);
            } else {
              // @todo: this is a lie, we should be async polling the state
              // here until the state is not running.
              logInfo('DOCKER => Container stopped.', cid);
            }
            callback(err);
          });
        }
      });
    }
  });
};

exports.remove = function(cid, opts, callback) {
  logInfo('DOCKER => Removing container.', cid);
  if (typeof opts === 'function') {
    callback = opts;
    opts = {
      v: true
    };
  }
  if (!opts.kill) {
    opts.kill = false;
  }
  getEnsure(cid, 'remove', function(err, container) {
    if (err) {
      callback(err);
    } else {
      inspect(container, function(err, data) {
        if (err) {
          callback(err);
        } else if (!data.State.Running) {
          container.remove(opts, function(err) {
            if (err) {
              logInfo('DOCKER => Error while removing container.', err);
            } else {
              logInfo('DOCKER => Container removed.', cid);
            }
            callback(err);
          });
        } else if (data.State.Running && opts.kill) {
          logInfo('DOCKER => Stopping container.', cid);
          container.stop(function(err) {
            if (err) {
              logInfo('DOCKER => Error while stopping container.', err);
              callback(err);
            } else {
              logInfo('DOCKER => Container stopped.', cid);
              container.remove(function(err) {
                if (err) {
                  logInfo('DOCKER => Error while removing container.', err);
                } else {
                  logInfo('DOCKER => Container removed.', cid);
                }
                callback(err);
              });
            }
          });
        } else {
          callback(
            new Error(
            'The container "' +
            cid +
            '" can NOT be removed, it is still running.'
            )
          );
        }
      });
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
  logDebug('DOCKER => DATA', parsedData);
  if (parsedData) {
    for (var x in parsedData) {
      if (x.toLowerCase() === 'errordetail') {
        return new Error(parsedData[x].message);
      }
    }
  }
};

exports.build = function(image, callback) {
  logInfo('DOCKER => Building image.', image);
  var workingDir = path.dirname(image.src);
  var filename = 'archive.tar';
  var file = path.resolve(workingDir, filename);

  process.chdir(workingDir);

  var archive =
    (process.platform === 'win32') ?
      // @todo: this is unbelievably janksauce
      // ideally handled at a deeper level
      file.replace(/\\/g, '/').replace('C:/', 'c:/').replace('c:/', '/c/') :
      file;
  var cmd = 'tar -cvf ' + archive + ' *';
  shell.exec(cmd, function(err, data) {
    if (err) {
      callback(err);
    } else {
      data = fs.createReadStream(file);
      docker.buildImage(data, {t: image.name}, function(err, stream) {
        if (err) {
          callback(err);
        } else {
          err = null;
          stream.on('data', function(data) {
            // seems like this listener is required for this to work.
            var parsedError = parseDockerStream(data);
            if (parsedError && !err) {
              err = parsedError;
            }
          });
          stream.on('end', function() {
            fs.unlinkSync(file);
            core.deps.call(function(globalConfig) {
              process.chdir(globalConfig.srcRoot);
            });
            logInfo('DOCKER => Building image complete.', image);
            callback(err);
          });
        }
      });
    }
  });
};

var pull = function(image, callback) {
  logInfo('DOCKER => Pulling image.', image);
  docker.pull(image.name, function(err, stream) {
    if (err) {
      callback(err);
    } else {
      err = null;
      stream.on('data', function(data) {
        var parsedErr = parseDockerStream(data);
        if (parsedErr && !err) {
          err = parsedErr;
        }
      });
      stream.on('end', function() {
        logInfo('DOCKER => Pulling image complete.', image);
        callback(err);
      });
    }
  });
};
exports.pull = pull;
