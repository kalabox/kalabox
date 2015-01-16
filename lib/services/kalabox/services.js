'use strict';

/**
 * Kalabox lib -> services -> kbox services module.
 * @module kbox/services
 */

var _ = require('lodash');
var path = require('path');
var fs = require('fs');
var core = require('./../../core.js');

var kalaboxSkydns = {
  name: 'kalabox/skydns',
  createOpts : {
    name: 'kalabox_skydns',
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
    name: 'kalabox_skydock',
    HostConfig : {
      NetworkMode: 'bridge',
      Binds : ['/var/run/docker.sock:/docker.sock']
    }
  },
  startOpts : {}
};

var kalaboxHipache = {
  name: 'kalabox/hipache',
  createOpts : {
    name: 'kalabox_hipache',
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
    name: 'kalabox_dnsmasq',
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
    servicesRoot: path.join(core.deps.lookup('globalConfig').sysConfRoot, 'services', 'kalabox'),
    services: [kalaboxDebian]
  };
};
exports.getConfig = getConfig;

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

exports.getStartOptions = function(service) {
  return getProperty(service, 'startOpts');
};

exports.getInstallOptions = function(service) {
  var opts = getProperty(service, 'createOpts');
  opts.Image = service.name;
  return opts;
};

var getService = function(name) {
  var service = _.filter(flattenServices(), {'name': name});
  return service[0];
};

var getCidRoot = function() {
  return path.resolve(path.join(getConfig().servicesRoot, '.cids'));
};
exports.getCidRoot = getCidRoot;

var getCidFile = function(service) {
  return path.resolve(path.join(getCidRoot(), (service.createOpts.name)));
};
exports.getCidFile = getCidFile;

exports.getCid = function(service) {
  var cidFile = getCidFile(service);
  if (fs.existsSync(cidFile)) {
    return fs.readFileSync(cidFile, 'utf8');
  }
  else {
    return false;
  }
};

exports.getCoreImages = function() {
  var services = flattenServices();
  var list = [];
  _.each(services, function(service) {
    list.push(service);
  });
  return _.flatten(list);
};

exports.getStartableServices = function() {
  var services = flattenServices();
  var list = [];
  _.each(services, function(service) {
    if (service.createOpts) {
      list.push(service);
    }
  });
  return _.flatten(list);
};
