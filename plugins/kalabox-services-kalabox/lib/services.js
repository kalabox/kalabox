'use strict';

/**
 * Kalabox lib -> services -> kbox services module.
 * @module kbox/services
 */

// @todo: @bcauldwell - Refactor

module.exports = function(kbox) {

  var _ = require('lodash');
  var path = require('path');
  var fs = require('fs');

  var core = kbox.core;

  var getHipachePostProviderOpts = function() {
    var kboxDomain = core.deps.lookup('globalConfig').domain;
    var kalaboxHipache = {
      createOpts: {
        Env: [
          'DOMAIN=' + kboxDomain,
        ]
      }
    };
    return kalaboxHipache;
  };

  var getSkydnsPostProviderOpts = function() {
    var kboxDomain = core.deps.lookup('globalConfig').domain;
    var kalaboxSkydns = {
      createOpts: {
        Cmd: [
          '-nameserver',
          '8.8.8.8:53',
          '-domain',
          kboxDomain
        ]
      }
    };
    return kalaboxSkydns;
  };

  var getSkydockPostProviderOpts = function() {
    var kboxDomain = core.deps.lookup('globalConfig').domain;
    var kalaboxSkydock = {
      createOpts: {
        Cmd: [
          '-s',
          '/docker.sock',
          '-domain',
          kboxDomain,
          '-name',
          'kalabox_skydns',
          '-plugins',
          '/root/skydock.js'
        ]
      }
    };
    return kalaboxSkydock;
  };

  var getDnsmasqPostProviderOpts = function() {
    var providerIP = core.deps.lookup('engineConfig').host;
    var kboxDomain = core.deps.lookup('globalConfig').domain;
    var kalaboxDnsmasq = {
      createOpts: {
        Env: [
          'KALABOX_IP=' + providerIP,
          'KALABOX_DOMAIN=.' + kboxDomain
        ],
        HostConfig: {
          PortBindings: {
            '53/udp': [{'HostIp' : providerIP, 'HostPort' : '53'}]
          }
        }
      }
    };
    return kalaboxDnsmasq;
  };

  var kalaboxHipache = {
    name: 'hipache',
    srcRoot: path.resolve(__dirname, '..'),
    createOpts : {
      name: 'kalabox_hipache',
      HostConfig : {
        NetworkMode: 'bridge',
        PortBindings: {
          '80/tcp' : [{'HostIp' : '', 'HostPort' : '80'}],
          '443/tcp' : [{'HostIp' : '', 'HostPort' : '443'}],
          '8160/tcp' : [{'HostIp' : '', 'HostPort' : '8160'}]
        },
        Binds: [
          '/certs/hipache:/certs:rw'
        ]
      }
    },
    postProviderOpts: 'getHipachePostProviderOpts',
    startOpts : {}
  };

  var kalaboxSkydns = {
    name: 'skydns',
    srcRoot: path.resolve(__dirname, '..'),
    createOpts: {
      name: 'kalabox_skydns',
      HostConfig: {
        NetworkMode: 'bridge',
        PortBindings: {
          '53/udp': [{'HostIp' : '172.17.0.1', 'HostPort' : '53'}],
        }
      }
    },
    postProviderOpts: 'getSkydnsPostProviderOpts',
    startOpts : {}
  };

  var kalaboxSkydock = {
    name: 'skydock',
    srcRoot: path.resolve(__dirname, '..'),
    createOpts: {
      name: 'kalabox_skydock',
      HostConfig: {
        NetworkMode: 'bridge',
        Binds: ['/var/run/docker.sock:/docker.sock']
      }
    },
    postProviderOpts: 'getSkydockPostProviderOpts',
    startOpts : {}
  };

  var kalaboxDnsmasq = {
    name: 'dnsmasq',
    srcRoot: path.resolve(__dirname, '..'),
    forcePull: true,
    createOpts: {
      name: 'kalabox_dnsmasq',
      ExposedPorts: {
        '53/tcp': {},
        '53/udp': {}
      },
      HostConfig: {
        NetworkMode: 'bridge'
      }
    },
    postProviderOpts: 'getDnsmasqPostProviderOpts',
    startOpts: {}
  };

  var kalaboxDebian = function() {
    return {
      name: 'kalabox/debian:stable',
      forcePull: true,
      children: [
        kalaboxSkydns,
        kalaboxSkydock,
        kalaboxHipache,
        kalaboxDnsmasq
      ]
    };
  };

  var kalaboxData = function() {
    return {
      name: 'data',
      forcePull: true,
      createOpts: {
        name: 'kalabox_data'
      },
      startOpts: {},
    };
  };

  var getConfig = function() {
    return {
      servicesRoot: path.join(
        core.deps.lookup('globalConfig').sysConfRoot, 'services', 'kalabox'
      ),
      services: [
        kalaboxDebian(),
        kalaboxData()
      ]
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
    list = _.remove(list, undefined);
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
    opts.Image = service.name;
    if (service.postProviderOpts) {
      var extraOpts = api[service.postProviderOpts]().createOpts;
      _.merge(opts, extraOpts);
    }
    return opts;
  };

  var getCidRoot = function() {
    return path.resolve(path.join(getConfig().servicesRoot, '.cids'));
  };

  var getCidFile = function(service) {
    return path.resolve(
      path.join(getCidRoot(), (getInstallOptions(service).name))
    );
  };

  var getCid = function(service) {
    var cidFile = getCidFile(service);
    if (fs.existsSync(cidFile)) {
      return fs.readFileSync(cidFile, 'utf8');
    }
    else {
      return false;
    }
  };

  var getCoreImages = function() {
    var services = flattenServices();
    var list = [];
    _.each(services, function(service) {
      list.push(service);
    });
    return _.flatten(list);
  };

  var getStartableServices = function() {
    var services = flattenServices();
    var list = [];
    _.each(services, function(service) {
      if (service.createOpts) {
        list.push(service);
      }
    });
    return _.flatten(list);
  };

  var api = {
    getCid: getCid,
    getCidFile: getCidFile,
    getCidRoot: getCidRoot,
    getConfig: getConfig,
    getCoreImages: getCoreImages,
    getDnsmasqPostProviderOpts: getDnsmasqPostProviderOpts,
    getInstallOptions: getInstallOptions,
    getSkydnsPostProviderOpts: getSkydnsPostProviderOpts,
    getHipachePostProviderOpts: getHipachePostProviderOpts,
    getSkydockPostProviderOpts: getSkydockPostProviderOpts,
    getStartOptions: getStartOptions,
    getStartableServices: getStartableServices
  };

  return api;

};
