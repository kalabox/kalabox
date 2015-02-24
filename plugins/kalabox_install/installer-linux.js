'use strict';

// dependencies
var _ = require('lodash');
var async = require('async');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var Decompress = require('decompress');
var mkdirp = require('mkdirp');
var fileinput = require('fileinput');
var S = require('string');

var kbox = require('../../lib/kbox.js');
var deps = kbox.core.deps;
var disk = kbox.util.disk;
var engine = kbox.engine;
var provider = kbox.engine.provider;
var services = kbox.services;
var shell = kbox.util.shell;
var download = kbox.util.download;
var firewall = kbox.util.firewall;
var internet = kbox.util.internet;
var cmd = kbox.install.cmd;
var sysProfiler = kbox.install.sysProfiler;
var vb = kbox.install.vb;

// constants
//var INSTALL_MB = 30 * 1000;
// @todo: these will eventually come from the factory
var PROVIDER_INIT_ATTEMPTS = 3;
var PROVIDER_UP_ATTEMPTS = 3;
// @todo: no idea what these looks like on fedora
var KALABOX_DNS_PATH = '/etc/resolvconf/resolv.conf.d';
var KALABOX_DNS_FILE = 'head';
var KALABOX_DNS_SERVERS = [];
var BOOT2DOCKER_CLI_BIN =
  'https://github.com/boot2docker/boot2docker-cli/releases/download/v1.4.1/' +
  'boot2docker-v1.4.1-linux-amd64';
var PROVIDER_DOWNLOAD_URL;
var PROVIDER_URL_PROFILE =
  'https://raw.githubusercontent.com/' +
  'kalabox/kalabox-boot2docker/master/profile';
var SYNCTHING_DOWNLOAD =
  'https://github.com/syncthing/syncthing/releases/download/v0.10.21/' +
  'syncthing-linux-amd64-v0.10.21.tar.gz';
var SYNCTHING_CONFIG =
  'https://raw.githubusercontent.com/' +
  'kalabox/kalabox-dockerfiles/master/syncthing/config.xml';
// variables
var adminCmds = [];
var providerIsInstalled;
var b2dIsInstalled;
var dnsIsSet;
var profileIsSet;
var syncThingIsInstalled;
var syncThingIsConfigged;
var firewallIsOkay;
var stepCounter = 1;

module.exports.run = function(done) {

  var log = {
    header: function(msg) {
      console.log('STEP [' + stepCounter + '] -- ' + msg + '...');
      stepCounter += 1;
    },
    alert: function(msg) {
      console.log(chalk.yellow(' ##### ' + msg + ' #####'));
    },
    info: function(msg) {
      console.log(chalk.gray(' --- ' + msg));
    },
    ok: function(msg) {
      console.log(chalk.green(' - ' + msg));
    },
    warn: function(msg) {
      console.log(chalk.red(' - ' + msg));
    },
    fail: function(msg) {
      console.log(chalk.red(' *** ' + msg + ' ***'));
      process.exit(1);
    },
    newline: function() { console.log(''); }
  };

  function sendMessage(msg) {
    console.log(msg);
  }

  function newline() { sendMessage(''); }

  function fail(msg) {
    console.log(chalk.red('*** ' + msg + ' ***'));
    process.exit(1);
  }

  // Very similar to profile scan.
  // @todo: generic "scanInfoFile()"?
  var osInfo = {};
  function getOSInfo(callback) {
    if (!_.isEmpty(osInfo)) {
      callback(osInfo);
    }
    var osInfoFile = new fileinput.FileInput(['/etc/os-release']);
    osInfoFile
      .on('line', function(line) {
        var current = S(line.toString('utf8')).trim().s;
        if (!S(current).startsWith('#') && !S(current).isEmpty()) {
          if (S(current).include('=')) {
            var pieces = current.split('=');
            osInfo[S(pieces[0]).trim().s] = S(pieces[1].replace(/"/g, '')).trim().s;
          }
        }
      })
      .on('end', function() {
        callback(osInfo);
      });
  }

    // Very similar to profile scan.
  // @todo: generic "scanInfoFile()"?
  var dnsInfo = [];
  function getCurrentNamservers(callback) {
    if (!_.isEmpty(dnsInfo)) {
      callback(dnsInfo);
    }
    var dnsFile = path.join(KALABOX_DNS_PATH, KALABOX_DNS_FILE);
    var dnsFileInfo = new fileinput.FileInput([dnsFile]);
    dnsFileInfo
      .on('line', function(line) {
        var current = S(line.toString('utf8')).trim().s;
        if (!S(current).startsWith('#') && !S(current).isEmpty()) {
          if (S(current).include(' ')) {
            var pieces = current.split(' ');
            if (S(pieces[0]).trim().s === 'nameserver') {
              dnsInfo.push(S(pieces[1].replace(/"/g, '')).trim().s);
            }
          }
        }
      })
      .on('end', function() {
        callback(dnsInfo);
      });
  }

  // Get correct
  function getProviderDL(info) {
    // Should support others but this is a start
    var objectOfDoom = {
      ubuntu: {
        '10.04': 'http://download.virtualbox.org/virtualbox/4.3.22/' +
          'virtualbox-4.3_4.3.22-98236~Ubuntu~lucid_amd64.deb',
        '12.04': 'http://download.virtualbox.org/virtualbox/4.3.22/' +
          'virtualbox-4.3_4.3.22-98236~Ubuntu~precise_amd64.deb',
        '12.10': 'http://download.virtualbox.org/virtualbox/4.3.22/' +
          'virtualbox-4.3_4.3.22-98236~Ubuntu~quantal_amd64.deb',
        '13.04': 'http://download.virtualbox.org/virtualbox/4.3.22/' +
          'virtualbox-4.3_4.3.22-98236~Ubuntu~raring_amd64.deb',
        '13.10': 'http://download.virtualbox.org/virtualbox/4.3.22/' +
          'virtualbox-4.3_4.3.22-98236~Ubuntu~raring_amd64.deb',
        '14.04': 'http://download.virtualbox.org/virtualbox/4.3.22/' +
          'virtualbox-4.3_4.3.22-98236~Ubuntu~raring_amd64.deb',
        '14.10': 'http://download.virtualbox.org/virtualbox/4.3.22/' +
          'virtualbox-4.3_4.3.22-98236~Ubuntu~raring_amd64.deb'
      },
      debian: {
        '6.0': 'http://download.virtualbox.org/virtualbox/4.3.22/' +
          'virtualbox-4.3_4.3.22-98236~Debian~squeeze_amd64.deb',
        '7.0': 'http://download.virtualbox.org/virtualbox/4.3.22/' +
          'virtualbox-4.3_4.3.22-98236~Debian~wheezy_amd64.deb'
      },
      fedora: {
        '17.0': 'http://download.virtualbox.org/virtualbox/4.3.22/' +
          'VirtualBox-4.3-4.3.22_98236_fedora17-1.x86_64.rpm',
        '18.0': 'http://download.virtualbox.org/virtualbox/4.3.22/' +
          'VirtualBox-4.3-4.3.22_98236_fedora18-1.x86_64.rpm',
        '19.0': 'http://download.virtualbox.org/virtualbox/4.3.22/' +
          'VirtualBox-4.3-4.3.22_98236_fedora18-1.x86_64.rpm',
        '20.0': 'http://download.virtualbox.org/virtualbox/4.3.22/' +
          'VirtualBox-4.3-4.3.22_98236_fedora18-1.x86_64.rpm',
        '21.0': 'http://download.virtualbox.org/virtualbox/4.3.22/' +
          'VirtualBox-4.3-4.3.22_98236_fedora18-1.x86_64.rpm'
      }
    };
    return objectOfDoom[info.ID][info.VERSION_ID];
  }

  async.series([

    // Figure out things about linux
    function(next) {
      log.header('Getting info about your linuxes');
      getOSInfo(function(info) {
        PROVIDER_DOWNLOAD_URL = getProviderDL(info);
        var OS_STRING =
          info.ID + ' ' + info.VERSION_ID + ' which is like ' + info.ID_LIKE;
        log.info('Running: ' + OS_STRING);
        if (PROVIDER_DOWNLOAD_URL) {
          log.info(PROVIDER_DOWNLOAD_URL + ' slated for Downloads');
        }
        else {
          log.fail(OS_STRING + ' is not yet supported. Contact maintainer.');
        }
        log.newline();
        next(null);
      });
    },

    // Check if boot2docker is already installed.
    function(next) {
      log.header('Checking if Boot2Docker is installed.');
      provider.isInstalled(function(err, isInstalled) {
        if (err) {
          throw err;
        }
        var msg = isInstalled ? 'is' : 'is NOT';
        log.info('Boot2Docker ' + msg + ' installed.');
        log.newline();
        b2dIsInstalled = isInstalled;
        next(null);
      });
    },

    // Check if vbox is already installed.
    function(next) {
      log.header('Checking if VirtualBox is installed.');
      var cmd = 'which VBoxManage';
      shell.exec(cmd, function(err, data) {
        providerIsInstalled = (err) ? false : true;
        var msg = providerIsInstalled ? 'is' : 'is NOT';
        log.info('VBoxManage ' + msg + ' installed.');
        log.newline();
        next(null);
      });
    },

    // Check if profile is already set.
    function(next) {
      log.header('Checking for KBOX Boot2Docker profile.');
      profileIsSet = fs.existsSync(
        path.join(deps.lookup('config').sysProviderRoot, 'profile')
      );
      var msg = profileIsSet ? 'exists.' : 'does NOT exist.';
      log.info('Boot2Docker profile ' + msg);
      log.newline();
      next(null);
    },

    // Check if syncthing is already installed.
    function(next) {
      log.header('Checking for syncthing binary.');
      syncThingIsInstalled = fs.existsSync(
        path.join(deps.lookup('config').sysConfRoot, 'bin', 'syncthing')
      );
      var msg = syncThingIsInstalled ? 'exists.' : 'does NOT exist.';
      log.info('Syncthing binary ' + msg);
      log.newline();
      next(null);
    },

    // Check if syncthing config already exists.
    function(next) {
      log.header('Checking for syncthing config.');
      syncThingIsConfigged = fs.existsSync(
        path.join(deps.lookup('config').sysConfRoot, 'syncthing', 'config.xml')
      );
      var msg = syncThingIsConfigged ? 'exists.' : 'does NOT exist.';
      log.info('Syncthing config ' + msg);
      log.newline();
      next(null);
    },

    // Check for access to the internets.
    function(next) {
      log.header('Checking internet access.');
      internet.check('www.google.com', function(err) {
        var msg = err === null ? 'OK' : 'NOT OK';
        var fnLog = err === null ? log.info : log.warn;
        fnLog('Internet access: ' + msg);
        if (err !== null) {
          log.fail('Internet is NOT accessable!');
        }
        newline();
        next(null);
      });
    },

    // Download dependencies to temp dir.
    function(next) {
      var urls = [];
      if (!syncThingIsInstalled) {
        urls.unshift(SYNCTHING_DOWNLOAD);
      }
      if (!syncThingIsConfigged) {
        urls.unshift(SYNCTHING_CONFIG);
      }
      if (!b2dIsInstalled) {
        urls.unshift(BOOT2DOCKER_CLI_BIN);
      }
      if (!providerIsInstalled) {
        urls.unshift(PROVIDER_DOWNLOAD_URL);
      }
      if (!profileIsSet) {
        urls.unshift(PROVIDER_URL_PROFILE);
      }
      if (urls.length > 0) {
        var dest = disk.getTempDir();
        log.header('Downloading dependencies.');
        urls.forEach(function(url) { log.info(url); });
        download.downloadFiles(urls, dest, function() {
          log.newline();
          next(null);
        });
      } else {
        next(null);
      }
    },

    // Setup profile.
    function(next) {

      if (!profileIsSet) {
        log.header('Setting up Boot2Docker profile.');
        async.series([

          function(next) {
            log.info('Creating config dir');
            mkdirp.sync(
              path.join(deps.lookup('config').sysProviderRoot)
            );
            log.ok('OK');
            next(null);
          },

          function(next) {
            var tmp = disk.getTempDir();
            var src = path.join(tmp, path.basename(PROVIDER_URL_PROFILE));
            var dest = path.join(
              deps.lookup('config').sysProviderRoot, 'profile'
            );
            log.info('Setting B2D profile.');
            fs.rename(src, dest, function() {
              log.ok('OK');
              newline();
              next(null);
            });
          }

        ], function(err, results) {
          if (err) {
            throw err;
          }
          next();
        });
      }
      else {
        next(null);
      }
    },

    // Check if DNS file is already set.
    // @todo: need a windows/linux version of this
    function(next) {
      log.header('Checking if DNS is set.');
      provider.getServerIps(function(ips) {
        getCurrentNamservers(function(nameservers) {
          _.forEach(ips, function(ip) {
            if (!_.contains(nameservers, ip)) {
              KALABOX_DNS_SERVERS.push(ip);
            }
          });
          dnsIsSet = (_.isEmpty(KALABOX_DNS_SERVERS)) ? true : false;
          var msg = dnsIsSet ? 'is set.' : 'is not set.';
          log.info('DNS ' + msg);
          log.newline();
          next(null);
        });
      });
    },

    // Extract syncthing and move config and files
    function(next) {
      if (!syncThingIsInstalled || !syncThingIsConfigged) {
        log.header('Setting up syncthing goodness.');
        var tmp = disk.getTempDir();
        if (!syncThingIsConfigged) {
          log.info('Creating syncthing config dir and setting config');
          var stConfig = path.join(tmp, path.basename(SYNCTHING_CONFIG));
          mkdirp.sync(
            path.join(deps.lookup('config').sysConfRoot, 'syncthing')
          );
          fs.renameSync(
            stConfig, path.join(
              deps.lookup('config').sysConfRoot, 'syncthing', 'config.xml'
            )
          );
          log.ok('OK');
          log.newline();
        }
        if (!syncThingIsInstalled) {
          log.info('Setting up syncthing binary');
          var stBinary = path.join(tmp, path.basename(SYNCTHING_DOWNLOAD));
          var decompress = new Decompress({mode: '755'})
            .src(stBinary)
            .dest(tmp)
            .use(Decompress.targz());

          decompress.run(function(err, files, stream) {
            if (err) {
              log.fail('Could not extract sycnthing correctly');
            }
            var binPath = path.join(deps.lookup('config').sysConfRoot, 'bin');
            mkdirp.sync(binPath);
            fs.renameSync(
              path.join(tmp, path.basename(stBinary, '.tar.gz'), 'syncthing'),
              path.join(binPath, 'syncthing')
            );
            log.ok('OK');
            log.newline();
            next(null);
          });
        }
        else {
          next(null);
        }
      }
      else {
        next(null);
      }
    },

    // Run install commands
    function(next) {
      if (!providerIsInstalled || !dnsIsSet) {
        log.header('Setting things up.');
        log.alert('ADMINISTRATIVE PASSWORD WILL BE REQUIRED!');

        async.series([

          // install pkgs
          function(next) {
            if (!providerIsInstalled) {
              var tempDir = disk.getTempDir();
              var pkg = path.join(
                tempDir, path.basename(PROVIDER_DOWNLOAD_URL)
              );
              log.info('Installing: ' + pkg);
              adminCmds.unshift(cmd.buildInstallCmd(pkg, osInfo));
              next(null);
            }
            else {
              next(null);
            }
          },

          // prepare /usr/local/bin
          function(next) {
            var owner = [process.env.USER, process.env.USER].join(':');
            adminCmds.unshift('chown ' + owner + ' /usr/local/bin');
            if (!fs.existsSync('/usr/local/bin')) {
              adminCmds.unshift('mkdir -p /usr/local/bin');
            }
            next(null);
          },

          // Set DNS
          function(next) {
            if (!dnsIsSet) {
              log.info('Setting up DNS for Kalabox.');
              var ipCmds = cmd.buildDnsCmd(
                KALABOX_DNS_SERVERS, [KALABOX_DNS_PATH, KALABOX_DNS_FILE]
              );
              adminCmds = adminCmds.concat(ipCmds);
              adminCmds = adminCmds.concat('resolvconf -u');
              next(null);
            }
            else {
              next(null);
            }
          },

          function(next) {
            if (!_.isEmpty(adminCmds)) {
              var child = cmd.runCmdsAsync(adminCmds);
              child.stdout.on('data', function(data) {
                log.info(data);
              });
              child.stdout.on('end', function() {
                log.info('Finished installing');
                log.newline();
                next();
              });
              child.stderr.on('data', function(data) {
                log.warn(data);
              });
            }
            else {
              next(null);
            }
          }

        ], function(err, results) {
            if (err) {
              throw err;
            }
            next();
          });

      }
      else {
        next(null);
      }
    },

    // Set up b2d binary
    function(next) {
      if (!b2dIsInstalled) {
        log.header('Setting up B2D CLI goodness.');
        var tmp = disk.getTempDir();
        var b2dBin = path.join(tmp, path.basename(BOOT2DOCKER_CLI_BIN));
        fs.renameSync(
          b2dBin, path.join('/usr/local/bin', 'boot2docker')
        );
        fs.chmodSync(path.join('/usr/local/bin', 'boot2docker'), '0755');
        log.ok('OK');
        log.newline();
        next(null);
      }
      else {
        next(null);
      }
    },

    // Init and start boot2docker
    function(next) {
      log.header('Setting up and turning on the Kalabox VM.');
      async.series([

        function(next) {
          // @todo: stop gap for #190 for now. eventually we will have a more
          // robust installer API for providers to add checks and prepares to
          // the installer.
          provider.up(function(err, output) {
            log.info(output);
            next(null);
          });
        }

      ], function(err) {
        if (err) {
          throw err;
        }
        next();
      });
    },

    function(next) {
      log.header('Installing core services.');
      services.install(function() {
        log.info('Core services installed.');
        next(null);
      });
    },

    function(next) {
      // @todo: This needs to better eventually.
      log.header('Installing core sharing');
      engine.build({name: 'kalabox/syncthing:stable'}, function() {
        log.info('Core sharing installed.');
        next(null);
      });
    },

    // Init and start boot2docker
    function(next) {
      log.header('Finishing up.');
      log.ok('Installation complete!');
    }

  ]);

  done();

};
