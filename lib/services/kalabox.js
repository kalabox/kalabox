'use strict';

/**
 * Kalabox lib -> services -> kbox module.
 * @module kbox
 */

var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var core = require('./../core.js');
var util = require('./../util.js');
var helpers = util.helpers;
var engine = require('./../engine.js');

var kalaboxSkydns = {
  name: 'kalabox/skydns',
  createOpts : {
    name: 'skydns',
    HostConfig : {
      NetworkMode: 'bridge',
      PortBindings: {
        '53/udp' : [{'HostIp' : '172.17.42.1', 'HostPort' : '53'}],
      }
    }
  },
  startOpts : {}
};

var kalaboxSkydock = {
  name: 'kalabox/skydock',
  createOpts : {
    name: 'skydock',
    HostConfig : {
      NetworkMode: 'bridge',
      Binds : ['/var/run/docker.sock:/docker.sock', '/skydock.js:/skydock.js']
    }
  },
  startOpts : {}
};

var kalaboxHipache = {
  name: 'kalabox/hipache',
  createOpts : {
    name: 'hipache',
    HostConfig : {
      NetworkMode: 'bridge',
      PortBindings: {
        '80/tcp' : [{'HostIp' : '', 'HostPort' : '80'}],
        '8160/tcp' : [{'HostIp' : '', 'HostPort' : '8160'}],
      }
    }
  },
  startOpts : {}
};

var kalaboxDnsmasq = {
  name: 'kalabox/dnsmasq',
  createOpts : {
    name: 'dnsmasq',
    Env: ['KALABOX_IP=1.3.3.7'],
    ExposedPorts: {
      '53/tcp': {},
      '53/udp': {}
    },
    HostConfig : {
      NetworkMode: 'bridge',
      PortBindings: {
        '53/udp' : [{'HostIp' : '1.3.3.7', 'HostPort' : '53'}]
      }
    }
  },
  startOpts : {}
};

var kalaboxDebian = {
  name: 'kalabox/debian',
  children : [kalaboxSkydns, kalaboxSkydock, kalaboxHipache, kalaboxDnsmasq]
};

var getConfig = function() {
  return {
    prefix: 'kalabox_',
    servicesRoot: path.join(core.deps.lookup('globalConfig').sysConfRoot, 'services', 'kalabox'),
    services: [kalaboxDebian]
  };
};

/*
 * Grabs from default config and builds dockerode ready things
 */
var getServices = function() {
  return getConfig().services;
};

var flattenServices = function() {
  // @todo: get this to handle more than just one level of children
  var list = [];
  _.each(getServices(), function(service) {
    list.push(_.omit(service, 'children'));
    list.push(service.children);
  });
  return _.flatten(list);
};

var getProperty = function(service, prop) {
  return service[prop];
};

var getStartOptions = function(service) {
  return getProperty(service, 'startOpts');
};

var getInstallOptions = function(service) {
  var opts = getProperty(service, 'createOpts');
  opts.name = getConfig().prefix + opts.name;
  opts.Image = service.name;
  return opts;
};

var getService = function(name) {
  var service = _.filter(flattenServices(), {'name': name});
  return service[0];
};

var getCidFile = function(service) {
  return path.join(getConfig().servicesRoot, '.cids', service.createOpts.name);
};

var getCoreImages = function() {
  var services = flattenServices();
  var list = [];
  _.each(services, function(service) {
    list.push(service);
  });
  return _.flatten(list);
};

var installService = function(service, callback) {
  engine.build(service, function(err) {
    if (err) {
      callback(err);
    } else {
      if (service.createOpts) {
        var installOptions = getInstallOptions(service);
        engine.create(installOptions, function(err, container) {
          if (err) {
            throw err;
          }
          if (container) {
            console.log('installOptions: ' + JSON.stringify(installOptions));
            fs.writeFileSync(path.resolve(getCidFile(service)), container.cid);
            callback(err);
          }
        });
      }
      else {
        callback(null);
      }
    }
  });
};

exports.install = function(callback) {
  var cidRoot = path.resolve(path.join(getConfig().servicesRoot, '.cids'));
  if (!fs.existsSync(cidRoot)) {
    mkdirp.sync(cidRoot);
  }
  helpers.mapAsync(
    getCoreImages(),
    function(service, done) {
      installService(service, done);
    },
    function(errs) {
      callback(errs);
    }
  );
};
