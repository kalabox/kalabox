'use strict';

var fs = require('fs');
var path = require('path');
var config = require('./config.js');
var _ = require('lodash');
var Docker = require('dockerode');
var docker = new Docker(config.docker);
var util = require('./util.js');

/**
 * Returns create options for a specific component.
 */
exports.createOpts = function(component) {
  var dopts = {
    Hostname: component.hostname,
    name: component.cname,
    Image: component.image.name,
    Dns: ['8.8.8.8', '8.8.4.4'],
    Env: ['APPNAME=' + component.app.appname, 'APPDOMAIN=' + component.app.appdomain],
    Volumes: {
      '/src': {}
    }
  };

  if (component.createOpts) {
    _(component.createOpts).each(function(opt, key) {
      dopts[key] = opt;
    });
  }

  return dopts;
};

/**
 * Creates a container for a specific component.
 */
exports.create = function(component, callback) {
  var sopts = exports.createOpts(component);
  docker.createContainer(sopts, function(err, container) {
    if (err) {
      throw err;
    }
    if (container) {
      var fs = require('fs');
      fs.writeFileSync(path.resolve(component.cidfile), container.id);
      callback(container);
    }
  });
};

/**
 * Returns start options for a specific component.
 */
exports.startOpts = function(component, opts) {
  var sopts = {
    Hostname: component.hostname,
    PublishAllPorts: true,
    Binds: [component.app.path + ':/src:rw'],
    Env: ['APPNAME=' + component.appname, 'APPDOMAIN=' + component.appdomain]
  };

  if (component.dataCname) {
    sopts.VolumesFrom = component.dataCname;
  }

  if (opts) {
    _(opts).each(function(opt, key) {
      sopts[key] = opt;
    });
  }

  return sopts;
};

/**
 * Starts the container of a specific component.
 */
exports.start = function(component, callback) {
  var sopts = exports.startOpts(component);
  docker.getContainer(component.cid).start(sopts, function(err, data) {
    // TODO: Handle errors
    callback(data);
  });
};

/**
 * Stops the container of a specific component.
 */
exports.stop = function(component, callback) {
  docker.getContainer(component.cid).stop(function(err, data) {
    callback(data);
  });
};

/**
 * Kills the container of a specific component.
 */
exports.kill = function(component, callback) {
  docker.getContainer(component.cid).kill(function(err, data) {
    callback(data);
  });
};

/**
 * Removes the container of a specific component.
 */
exports.remove = function(component, callback) {
  docker.getContainer(component.cid).remove(function(err, data) {
    if (!err && fs.existsSync(component.cidfile)) {
      fs.unlinkSync(component.cidfile);
    }
    callback(data);
  });
};

exports.name = {
  _USER_DEFINED_PREFIX: 'kb',
  _BUILT_IN_PREFIX: 'kalabox',
  createUserDefined: function(appName, componentName) {
    return util.name.create([this._USER_DEFINED_PREFIX, appName, componentName]);
  },
  createBuiltIn: function(appName, componentName) {
    return util.name.create([this._BUILT_IN_PREFIX, appName, componentName]);
  },
  parse: function(name) {
    // remove white space from front of container name
    var _name = name[0] === ' ' || name[0] === '/' ? name.substring(1) : name;
    var parts = util.name.parse(_name);
    if (parts === null) {
      return null;
    } else {
      return {
        prefix: parts[0],
        appName: parts[1],
        componentName: parts[2]
      };
    }
  },
  isUserDefined: function(parsed) {
    return parsed.prefix === this._USER_DEFINED_PREFIX;
  },
  isBuiltIn: function(parsed) {
    return parsed.prefix === this._BUILT_IN_PREFIX;
  },
  isKalaboxName: function(parsed) {
    return this.isUserDefined(parsed) || this.isBuiltIn(parsed);
  }
};
