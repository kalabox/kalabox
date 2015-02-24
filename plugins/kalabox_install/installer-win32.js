'use strict';

// dependencies
var _ = require('lodash');
var async = require('async');
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var Decompress = require('decompress');
var mkdirp = require('mkdirp');

var kbox = require('../../lib/kbox.js');
var deps = kbox.core.deps;
var disk = kbox.util.disk;
var engine = kbox.engine;
var provider = kbox.engine.provider;
var services = kbox.services;
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
var PROVIDER_URL_DOWNLOAD =
  'https://github.com/boot2docker/windows-installer/releases/download/v1.4.1/' +
  'docker-install.exe';
var PROVIDER_URL_INF = 'https://raw.githubusercontent.com/kalabox/' +
  'kalabox-boot2docker/master/b2d.inf';
var PROVIDER_URL_PROFILE =
  'https://raw.githubusercontent.com/' +
  'kalabox/kalabox-boot2docker/master/profile';
var SYNCTHING_DOWNLOAD =
  'https://github.com/syncthing/syncthing/releases/download/v0.10.21' +
  '/syncthing-windows-amd64-v0.10.21.zip';
var SYNCTHING_CONFIG =
  'https://raw.githubusercontent.com/' +
  'kalabox/kalabox-dockerfiles/master/syncthing/config.xml';
// variables
var adminCmds = [];
var providerIsInstalled;
var dnsIsSet = false;
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

  async.series([

    // Check if boot2docker is already installed.
    // specific components if their source is different than what is installed
    function(next) {
      log.header('Checking if Boot2Docker is installed.');
      providerIsInstalled = fs.existsSync(
        'C:\\Program Files\\Boot2Docker for Windows\\boot2docker.exe'
      );
      var msg = providerIsInstalled ? 'is' : 'is NOT';
      log.info('Boot2Docker ' + msg + ' installed.');
      log.newline();
      next(null);
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
        path.join(deps.lookup('config').sysConfRoot, 'bin', 'syncthing.exe')
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
      if (!providerIsInstalled) {
        urls.unshift(PROVIDER_URL_DOWNLOAD);
        urls.unshift(PROVIDER_URL_INF);
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
            .use(Decompress.zip());

          decompress.run(function(err, files, stream) {
            if (err) {
              log.fail('Could not extract sycnthing correctly');
            }
            var binPath = path.join(deps.lookup('config').sysConfRoot, 'bin');
            mkdirp.sync(binPath);
            fs.renameSync(
              path.join(tmp, path.basename(stBinary, '.zip'), 'syncthing.exe'),
              path.join(binPath, 'syncthing.exe')
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

    // Install packages.
    function(next) {
      if (!providerIsInstalled || !dnsIsSet) {
        log.header('Setting things up.');
        log.alert('ADMINISTRATIVE PASSWORD MAY BE REQUIRED!');

        async.series([

          function(next) {
            if (!providerIsInstalled) {
              var tempDir = disk.getTempDir();
              var pkg = path.join(
                tempDir, path.basename(PROVIDER_URL_DOWNLOAD)
              );
              log.info('Installing: ' + pkg);
              adminCmds.unshift(
                cmd.buildInstallCmd(
                  pkg,
                  path.join(tempDir, path.basename(PROVIDER_URL_INF))
                )
              );
              next(null);
            }
            else {
              next(null);
            }
          },

          function(next) {
            if (!_.isEmpty(adminCmds)) {
              var child = cmd.runCmdsAsync(adminCmds);
              child.stderr.on('data', function(data) {
                console.log(data);
                log.fail('Something bad happened!');
              });
              child.stdout.on('data', function(data) {
                console.log(data);
              });
              child.on('exit', function(code) {
                log.info('Install completed with code ' + code);
                log.ok('OK');
                log.newline();
                next(null);
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

    // DNS THINGS
    function(next) {
      if (!dnsIsSet) {
        log.info('Setting up DNS for Kalabox.');
        deps.call(function(shell) {
          var nic = '"C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe" showvminfo "Kalabox2" | findstr "Host-only"';
          shell.exec(nic, function(err, output) {
            if (err) {
            }
            else {
              var start = output.indexOf('\'');
              var last = output.lastIndexOf('\'');
              var adapter = [output.slice(start + 1, last).replace('Ethernet Adapter', 'Network')];
              console.log(adapter);
              provider.getServerIps(function(ips) {
                var ipCmds = cmd.buildDnsCmd(
                  ips, adapter
                );
                adminCmds = ipCmds;
                var child = cmd.runCmdsAsync(adminCmds);
                child.stderr.on('data', function(data) {
                  console.log(data);
                  log.fail('Something bad happened!');
                });
                child.stdout.on('data', function(data) {
                  console.log(data);
                });
                child.on('exit', function(code) {
                  log.info('Install completed with code ' + code);
                  log.ok('OK');
                  log.newline();
                  next(null);
                });
              });
            }
          });
        });
      }
      else {
        next(null);
      }
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

    // Spin up with correct windoze user
    function(next) {
      async.series([
        function(next) {
          var winB2d = '"C:\\Program Files\\Boot2Docker for Windows\\boot2docker.exe"';
          var turnUpForWhat = [winB2d + ' --vm="Kalabox2" down'];
          var child = cmd.runCmdsAsync(turnUpForWhat);
          child.stdout.on('data', function(data) {
            console.log(data);
          });
          child.on('exit', function(code) {
            log.info('Install completed with code ' + code);
            log.ok('OK');
            log.newline();
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

    // Init and start boot2docker
    function(next) {
      log.header('Finishing up.');
      log.ok('Installation complete!');
    }

  ]);

  done();

};
