'use strict';

/**
 * This contains all helper methods for the services install
 */

module.exports = function(kbox) {

  // Native modules
  var fs = require('fs');
  var path = require('path');
  var url = require('url');

  // Npm modules
  var _ = require('lodash');

  // Kalabox modules
  var provider = kbox.engine.provider;
  var Promise = kbox.Promise;
  var install = kbox.install;

  // Services config
  var config = kbox.util.yaml.toJson(path.join(__dirname, 'config.yml'));
  var posixDnsFile = kbox.core.deps.lookup('globalConfig').domain;

  // Set Kalabox DNS constantsz
  // @todo: get this from engine somehow?
  var KALABOX_WIN32_DNS = '10.13.37.100';

  /*
   * Helper function to assess whether we need new service images
   */
  var needsImages = function() {
    return install.getProUp('SERVICE_IMAGES_VERSION', config.version);
  };

  /*
   * Helper function to determine whether we need to run darwin DNS commands
   */
  var needsDarwinDNS = function() {
    var dnsFile = path.join(config.dns.files.darwin.path, posixDnsFile);
    return !fs.existsSync(dnsFile);
  };

  /*
   * Helper function to determine whether we need to run linux DNS commands
   */
  var needsLinuxDNS = function() {
    var flavor = kbox.util.linux.getFlavor();
    var dnsDir = config.dns.files.linux[flavor].path;
    return !fs.existsSync(path.join(dnsDir, posixDnsFile));
  };

  /*
   * Get the correct windows network adapter
   */
  var getWindowsAdapter = function() {

    // Get shell library.
    var shell = kbox.core.deps.get('shell');

    // Command to run
    var cmd = [
      '"C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe"',
      'showvminfo "Kalabox2" | findstr "Host-only"'
    ];

    // Get network information from virtual box.
    return Promise.fromNode(function(cb) {
      shell.exec(cmd.join(' '), cb);
    })

    // Parse the output
    .then(function(output) {

      // Debug log output
      kbox.core.log.debug('ADAPTER INFO => ' + JSON.stringify(output));

      // Parse output to get network adapter information.
      var start = output.indexOf('\'');
      var last = output.lastIndexOf('\'');

      // Get the adapter
      var adapter = [
        output.slice(start + 1, last).replace('Ethernet Adapter', 'Network')
      ];

      // debug
      kbox.core.log.debug('WINDOWS ADAPTER => ' + JSON.stringify(adapter));

      // Return
      return adapter;
    });

  };

  /*
   * Helper function to determine whether we need to run win32 DNS commands
   * @todo: Need to expand this to handle both nameservers
   */
  var needsWin32DNS = function() {

    // Get shell library.
    var shell = kbox.core.deps.get('shell');

    // Grab the host only adapter so we can be SUPER PRECISE!
    return getWindowsAdapter()

    // Get network information from virtual box.
    .then(function(adapter) {

      var adp = adapter;

      // Command to run
      var cmd = 'netsh interface ipv4 show dnsservers';

      // Execute shell
      return shell.exec(cmd)

      // Need to catch findstr null reporting as error
      .catch(function(/*err*/) {
        // @todo: something more precise here
      })

      .then(function(output) {

        // Truncate the string for just data on what we need
        // This elminates the possibility that another adapter has our
        // setup. Although, to be fair, if another adapter does then
        // we are probably SOL anyway.

        // Trim the left
        var leftTrim = 'Configuration for interface "' + adp + '"';
        var truncLeft = output.indexOf(leftTrim);
        var left = output.slice(truncLeft);

        // Trim the right
        var rightTrim = 'Register with which suffix:';
        var truncRight = left.indexOf(rightTrim);
        var adapterConfig = left.slice(0, truncRight);

        // Get the raw DNS IPs
        var aSplit = adapterConfig.split(':');
        var rawAdapters = _.trim(aSplit[1]);

        // Map to array of IPs
        var adapters = _.map(rawAdapters.split('\r\n'), function(rawAdapter) {
          return _.trim(rawAdapter);
        });

        // Return precise
        var needDns = adapters[0] !== KALABOX_WIN32_DNS;
        kbox.core.log.debug('DNS SET CORRECTLY => ' + JSON.stringify(needDns));
        return needDns;
      });
    });

  };

  /*
   * Validate admin commands
   */
  var validateCmds = function(cmds) {

    // Check if this is an array
    if (!Array.isArray(cmds)) {
      return 'Invalid adminCommands: ' + cmds;
    }

    // Check if each cmd is a string
    cmds.forEach(function(cmd, index) {
      if (typeof cmd !== 'string' || cmd.length < 1) {
        return 'Invalid cmd index: ' + index + ' cmd: ' + cmd;
      }
    });

    // Looks like we good!
    return true;

  };

  /*
   * Run the admin commands
   */
  var runCmds = function(adminCommands, state, callback) {

    // Validate the admin commands
    if (validateCmds(adminCommands) !== true) {
      callback(new Error(validateCmds(adminCommands)));
    }

    // Process admin commands.
    var child = kbox.util.shell.execAdminAsync(adminCommands, state);

    // Events
    // Output data
    child.stdout.on('data', function(data) {
      state.log.info(data);
    });
    // Callback when done
    child.stdout.on('end', function() {
      callback();
    });
    // Output stderr data.
    child.stderr.on('data', function(data) {
      state.log.info(data);
    });
    // Fail the installer if we get an error
    child.stderr.on('error', function(err) {
      state.fail(state, err);
    });

  };

  /*
   * Helper to set up darwin DNS
   */
  var setupDarwinDNS = function(state) {

    // Start up a collector
    var dnsCmds = [];

    // Get list of server ips.
    return provider().call('getServerIps')

    // Add dns setup command.
    .then(function(ips) {

      // Build DNS command
      if (needsDarwinDNS()) {
        var dnsFile = [config.dns.files.darwin.path, posixDnsFile];
        var ipCmds = kbox.util.dns.dnsCmd(ips, dnsFile);
        var cmd = ipCmds.join(' && ');
        dnsCmds.push(cmd);
      }

      // Debug
      kbox.core.log.debug('DNS CMDS => ' + JSON.stringify(dnsCmds));

      // Try to install DNS if we have commands to run
      return Promise.fromNode(function(cb) {
        if (!_.isEmpty(dnsCmds)) {
          runCmds(dnsCmds, state, cb);
        }
        else {
          cb();
        }
      });

    });

  };

  /*
   * Helper to set up windows DNS
   */
  var setupWindowsDNS = function(state) {

    // Start up a collector
    var dnsCmds = [];

    return needsWin32DNS()

    .then(function(needsDns) {
      if (needsDns) {
        // Grab the appropriate windows network adapter
        return getWindowsAdapter()
        // Generate teh DNS commands and run it
        .then(function(adapter) {

          // Get list of server IPs.
          return provider().call('getServerIps')

          .then(function(ips) {

            // Build DNS commands
            dnsCmds = (kbox.util.dns.dnsCmd(ips, adapter));

            // Debug
            state.log.debug('DNS CMDS => ' + JSON.stringify(dnsCmds));

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
   * Helper to set up linux DNS
   */
  var setupLinuxDNS = function(state) {

 // Start up a collector
    var dnsCmds = [];

    // Get list of server ips.
    return provider().call('getServerIps')

    // Add dns setup command.
    .then(function(ips) {

      // Build DNS command
      if (needsLinuxDNS()) {

        // Get linux flavor
        var flavor = kbox.util.linux.getFlavor();

        var dnsDir = path.join(config.dns.pkg.linux[flavor].path);
        var dnsFile = [dnsDir, posixDnsFile];

        var ipCmds = kbox.util.dns.dnsCmd(ips, dnsFile);
        var cmd = ipCmds.join(' && ');
        dnsCmds.push(cmd);
      }

      // Debug
      kbox.core.log.debug('DNS CMDS => ' + JSON.stringify(dnsCmds));

      // Try to install DNS if we have commands to run
      return Promise.fromNode(function(cb) {
        if (!_.isEmpty(dnsCmds)) {
          runCmds(dnsCmds, state, cb);
        }
        else {
          cb();
        }
      });

    });

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
