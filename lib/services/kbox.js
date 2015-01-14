'use strict';

/**
 * Kalabox lib -> services -> kbox module.
 * @module kbox
 */

var _ = require('lodash');
var async = require('async');
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

var config = {
  prefix: 'kalabox_',
  services: [kalaboxDebian]
};

/*
 * Grabs from default config and builds dockerode ready things
 */
var getServices = function() {
  return config.services;
};

var flattenServices = function() {
  // @todo: get this to handle more than just one level of children
  var list = [];
  _.each(config.services, function(service) {
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

var getCreateOptions = function(service) {
  return getProperty(service, 'createOpts');
};

var getService = function(name) {
  // @todo: get this to handle more than just one level of children
  var service = _.filter(flattenServices(), {'name': name});
  return service[0];
};

/*
 * Grabs from default config and builds dockerode ready things
 */
var getCoreImages = function() {
  var services = flattenServices();
  var list = [];
  _.each(services, function(service) {
    list.push(_.omit(service, 'createOpts', 'startOpts'));
  });
  return _.flatten(list);
};

exports.install = function(callback) {
  helpers.mapAsync(
    getCoreImages(),
    function(image, done) {
      engine.build(image, done);
    },
    function(errs) {
      callback(errs);
    }
  );
};
