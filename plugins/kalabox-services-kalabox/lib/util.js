'use strict';

/**
 * This contains all helper methods for the services install
 */

module.exports = function(kbox) {

  // Native modules
  var fs = require('fs');
  var path = require('path');
  var url = require('url');
  var os = require('os');

  // Npm modules
  var _ = require('lodash');

  // Kalabox modules
  var provider = kbox.engine.provider;
  var Promise = kbox.Promise;
  var install = kbox.install;

  // Services config
  var config = kbox.util.yaml.toJson(path.join(__dirname, 'config.yml'));
  var posixDnsFile = kbox.core.deps.lookup('globalConfig').domain;

  // Set of logging functions.
  var log = kbox.core.log.make('SERVICES DNS');

  /*
   * Helper function to assess whether we need new service images
   */
  var needsImages = function() {
    return install.getProUp('SERVICE_IMAGES_VERSION', config.version);
  };

  /*
   * Needs Posix DNS helper
   */
  var needsPosixDns = function(dnsFile) {
    return !fs.existsSync(dnsFile);
  };

  /*
   * Helper function to determine whether we need to run darwin DNS commands
   */
  var needsDarwinDNS = function() {
    return needsPosixDns(path.join(config.dns.files.darwin.path, posixDnsFile));
  };

  /*
   * Helper function to determine whether we need to run linux DNS commands
   */
  var needsLinuxDNS = function() {
    var flavor = kbox.util.linux.getFlavor();
    var dnsDir = config.dns.files.linux[flavor].path;
    return needsPosixDns(path.join(dnsDir, posixDnsFile));
  };

  /*
   * Helper method to get windows hostonly adapter
   */
  var getWindowsAdapter = function() {

    // Return engine IP
    return provider().call('getIp')

    // Get subnet
    .then(function(ip) {
      return (_.dropRight(ip.split('.'), 1)).join('.');
    })

    // Get adapter
    .then(function(sub) {
      return _.findKey(os.networkInterfaces(), function(iface) {
        return _.includes(iface[1].address, sub);
      });
    });

  };

  /*
   * Helper function to determine whether we need to run win32 DNS commands
   * @todo: when JXCORE updates to node 0.12+ we can use dns.getServers();
   */
  var needsWin32DNS = function() {

    // Get our adapter so we can match up some shit
    return getWindowsAdapter()

    // Get the DNS servers for our adapter
    .then(function(adapter) {

      // Get our DNS servers
      var cmd = [
        'netsh',
        'interface',
        'ipv4',
        'show',
        'dnsservers'
      ];

      // Execute shell
      return kbox.util.shell.exec(cmd)

      // Crazy parse chaos
      .then(function(output) {

        // Trim the left
        var leftTrim = 'Configuration for interface "' + adapter + '"';
        var truncLeft = output.indexOf(leftTrim);
        var left = output.slice(truncLeft);

        // Trim the right
        var rightTrim = 'Register with which suffix:';
        var truncRight = left.indexOf(rightTrim);
        var adapterConfig = left.slice(0, truncRight);

        // Get the raw DNS IPs
        var aSplit = adapterConfig.split(':');
        var rawIps = _.trim(aSplit[1]);

        // Map to array of IPs
        var ips = _.map(rawIps.split('\r\n'), function(rawIp) {
          return _.trim(rawIp);
        });

        // Get our IP
        return provider().call('getIp')

        // Determin whether we are good or not
        .then(function(engineIp) {
          return !_.includes(ips, engineIp);
        });

      });
    });

  };

  /*
   * Helper to set up windows DNS
   */
  var setupWindowsDNS = function() {

    // Check whether we need this or not
    return needsWin32DNS()

    .then(function(needsDns) {

      if (needsDns) {

        // Get windows adapter
        return getWindowsAdapter()

        // Generate teh DNS commands and run it
        .then(function(adapter) {

          // Get list of server IPs.
          return provider().call('getIp')

          .then(function(ip) {

            // Build DNS commands
            var dnsCmds = kbox.util.dns.dnsCmd(ip, adapter);

            // Debug
            log.debug(dnsCmds);

            // Run each command through elevation
            // @todo: doesn't seem like node-windows can
            // handle combining via & or && so do this for now
            return Promise.each(dnsCmds, function(cmd) {
              return kbox.util.shell.execElevated(cmd);
            });
          });

        });
      }
    });

  };

  /*
   * Helper to set up posix DNS
   */
  var setupPosixDNS = function(needs, dnsFile) {

    // Return engine IP
    return provider().call('getIp')

    .then(function(ip) {
      // Build DNS command
      if (needs) {
        // GEt the commands and att them
        var dnsCmd = kbox.util.dns.dnsCmd(ip, dnsFile);
        // Debug
        log.debug(dnsCmd);
        // Try to install DNS if we have commands to run
        return kbox.util.shell.execAdminAsync(dnsCmd);
      }
    });

  };

  /*
   * Helper to set up darwin DNS
   */
  var setupDarwinDNS = function() {
    var dnsFile = [config.dns.files.darwin.path, posixDnsFile];
    return setupPosixDNS(needsDarwinDNS(), dnsFile);
  };

  /*
   * Helper to set up linux DNS
   */
  var setupLinuxDNS = function() {
    var flavor = kbox.util.linux.getFlavor();
    var dnsDir = path.join(config.dns.files.linux[flavor].path);
    var dnsFile = [dnsDir, posixDnsFile];
    return setupPosixDNS(needsLinuxDNS(), dnsFile);
  };

  /*
   * Helper to get the resolver package name
   */
  var getResolverPkgName = function() {

    // Get the linux flavor and version
    // VERSION_ID="14.04"
    var flavor = kbox.util.linux.getFlavor();
    var version = kbox.util.linux.get().VERSION_ID.replace('.', '_');

    // Determine whether we need to use a generic version or not
    var flavorPkgs = config.dns.pkg[flavor];
    var hasPkg = _.includes(Object.keys(flavorPkgs), version);
    var pkgName = (hasPkg) ? flavorPkgs[version] : flavorPkgs.default;

    // Return the pkg path
    return pkgName;

  };

  /*
   * Helper to get the resolver package path
   */
  var getResolverPkgPath = function() {

    // Get download directory
    var pkgDir = kbox.util.disk.getTempDir();

    // Return the pkg path
    return path.join(pkgDir, getResolverPkgName());

  };

  /*
   * Helper to get the resolver package install command
   */
  var getResolverPkgInstall = function() {

    // Get the pack and escape it if needed
    var pkg = getResolverPkgPath();
    var escPack = pkg.replace(/ /g, '\\ ');

    // Return based on flavor
    switch (kbox.util.linux.getFlavor()) {
      case 'debian': return ['dpkg', '-i', escPack].join(' ');
      case 'fedora': return ['rpm', '-Uvh', escPack].join(' ');
    }

  };

  /*
   * Helper to get the resolver package url
   */
  var getResolverPkgUrl = function() {

    // Get pacakge name
    var pkg = getResolverPkgName();

    // Url METADATA
    var pathBase = 'azukiapp/libnss-resolver/releases/download';
    var release = 'v0.3.0';
    var build = {
      protocol: 'https',
      slashes: true,
      hostname: ['github', 'com'].join('.'),
      pathname: [pathBase, release, pkg].join('/')
    };

    // Format our metadata into a url
    return url.format(build);

  };

  return {
    needsImages: needsImages,
    setupDarwinDNS: setupDarwinDNS,
    setupWindowsDNS: setupWindowsDNS,
    setupLinuxDNS: setupLinuxDNS,
    getResolverPkgInstall: getResolverPkgInstall,
    getResolverPkgUrl: getResolverPkgUrl
  };

};
