
// dependencies
var async = require('async'),
  chalk = require('chalk'),
  disk = require('./lib/disk.js'),
  download = require('./lib/download.js'),
  firewall = require('./lib/firewall.js'),
  installer = require('./lib/installer.js'),
  internet = require('./lib/internet.js'),
  path = require('path'),
  shell = require('./lib/shell.js'),
  sys_profiler = require('./lib/sys_profiler.js'),
  virtualBox = require('./lib/virtualBox.js');

// constants
var INSTALL_MB = 30 * 1000;
var B2D_URL_V1_3_0 = 'https://github.com/boot2docker/osx-installer/releases/download/v1.3.0/Boot2Docker-1.3.0.pkg';
var B2D_URL_PROFILE = 'https://raw.githubusercontent.com/kalabox/kalabox-boot2docker/master/profile';
// variables
var b2dIsInstalled,
  firewallIsOkay,
  stepCounter = 1;

var main = function () {

  var log = {
    header: function (msg) {
      console.log('STEP [' + stepCounter + '] -- ' + msg + '...');
      stepCounter += 1;
    },
    alert: function (msg) {
      console.log(chalk.yellow(' ##### ' + msg + ' #####'));
    },
    info: function (msg) {
      console.log(chalk.gray(' --- ' + msg));
    },
    ok: function (msg) {
      console.log(chalk.green(' - ' + msg));
    },
    warn: function(msg) {
      console.log(chalk.red( ' - ' + msg));
    },
    fail: function (msg) {
      console.log(chalk.red(' *** ' + msg + ' ***'));
      process.exit(1);
    },
    newline: function () { console.log(''); }
  };

  function sendMessage(msg) {
    console.log(msg);
  };

  function newline() { sendMessage(''); };

  function fail(msg) {
    console.log(chalk.red('*** ' + msg + ' ***'));
    process.exit(1);
  };

  async.series([

    // Check if boot2docker is already installed.
    function (next) {
      log.header('Checking if Boot2Docker is installed.');
      sys_profiler.isAppInstalled('Boot2Docker', function (err, isInstalled) {
        if (err) throw err;
        var msg = isInstalled ? 'is' : 'is NOT';
        var fn_log = isInstalled ? log.warn : log.ok ;
        fn_log('Boot2Docker ' + msg + ' installed.');
        log.newline();
        b2dIsInstalled = isInstalled;
        next(null);
      });
    },

    // Check if VirtualBox.app is running.
    function (next) {
      log.header('Checking if VirtualBox is running.');
      virtualBox.isRunning(function (err, isRunning) {
        if (err) throw err;
        if (isRunning) {
          log.warn('VirtualBox: is currently running.');
          log.fail('Please stop VirtualBox and then run install again.');
        } else {
          log.ok('VirtualBox: is NOT currently running.');
        }
        log.newline();
        next();
      });
    },

    // Check the firewall settings.
    function (next) {
      log.header('Checking firewall settings.');
      firewall.isOkay(function (isOkay) {
        var msg = isOkay ? 'OK' : 'NOT OK';
        var fn_log = isOkay ? log.ok : log.fail;
        fn_log('Firewall settings: ' + msg);
        log.newline();
        firewallIsOkay = isOkay;
        next(null);
      });
    },

    // Check for access to the internets.
    function (next) {
      log.header('Checking internet access.');
      internet.check('www.google.com', function (err) {
        var msg = err === null ? 'OK' : 'NOT OK';
        var fn_log = err === null ? log.ok : log.warn;
        fn_log('Internet access: ' + msg);
        if (err !== null) {
          log.fail('Internet is NOT accessable!');
        }
        newline();
        next(null);
      });
    },

    // Check available disk space for install.
    function (next) {
      log.header('Checking disk free space.');
      disk.getFreeSpace(function (err, freeMbs) {
        freeMbs = Math.round(freeMbs);
        var enoughFreeSpace = freeMbs > INSTALL_MB;
        var fn_log = enoughFreeSpace ? log.ok : log.warn;
        fn_log(freeMbs + ' MB free of the required ' + INSTALL_MB + ' MB');
        if (!enoughFreeSpace) {
          log.fail('Not enough disk space for install!');
        }
        newline();
        next(null);
      });
    },

    // Download dependencies to temp dir.
    function (next) {
      var urls = b2dIsInstalled ? [
        B2D_URL_PROFILE
      ] : [
        B2D_URL_V1_3_0,
        B2D_URL_PROFILE
      ];
      if (urls.length > 0) {
        dest = disk.getTempDir();
        log.header('Downloading dependencies.');
        urls.forEach(function (url) { log.info(url); });
        download.downloadFiles(urls, dest, function () {
          log.newline();
          next(null);
        });
      } else {
        next(null);
      }
    },

    // Install packages.
    function (next) {
      log.header('Installing packages.');
      log.alert('ADMINISTRATIVE PASSWORD WILL BE REQUIRED!');
      var tempDir = disk.getTempDir();
      var pkg = path.join(tempDir, path.basename(B2D_URL_V1_3_0));
      disk.getMacVolume(function (err, volume) {
        if (err) throw err;
        log.info('Installing: ' + pkg);
        var child = installer.installAsync(pkg, volume);
        child.stdout.on('data', function (data) {
          log.info(data);
        });
        child.stdout.on('end', function () {
          log.ok('Finished installing: ' + pkg);
          log.newline();
          next();
        });
        child.stderr.on('data', function (data) {
          log.warn(data);
        });
      });
    },

    // Setup profile.
    function (next) {

      log.header('Setting up Boot2Docker profile.');
      async.series([

        function (next) {
          var cmd = 'mkdir -p ~/.boot2docker/';
          log.info(cmd);
          shell.exec(cmd, function (err, data) {
            if (err) throw err;
            log.ok('OK');
            next(null);
          });
        },

        function (next) {
          var tmp = disk.getTempDir();
          var src = path.join(tmp, path.basename(B2D_URL_PROFILE));
          var dest = '~/.boot2docker/';
          var cmd = 'cp ' + src + ' ' + dest;
          log.info(cmd);
          shell.exec(cmd, function (err, data) {
            if (err) throw err;
            log.ok('OK');
            newline();
            next(null);
          });
        }

      ], function (err, results) {
        if (err) throw err;
        next();
      });

    },

    // Init and start boot2docker
    function (_next) {
      async.eachSeries(['init', 'up'], function (action, next) {
        var cmd = 'boot2docker ' + action + ' -v';
        log.header('Running: ' + cmd);
        var child = shell.execAsync(cmd);
        child.stdout.on('data', function (data) {
          log.info(data);
        });
        child.stdout.on('end', function () {
          log.ok('Finished running: ' + cmd);
          next();
        });
        }, function (err) {
          if (err) throw err;
          _next();
        }
      );

    }

  ]);



  // Check if boot2docker is already installed.
    // @todo: use osx 'system_profiler' command
    //system_profile.isApplicationInstalled()

  // Check firewall settings.
    // @todo: use osx 'socketfilterfw' command
    //firewall.isSettingsOkay()

  // Download dependencies in parallel
    // Download boot2docker.
      // @todo: use 'npm install download' module
    // Download Kalabox image.
      // @todo: use 'npm install download' module
      //downloader.downloadFiles()
  /*download.downloadFiles([
      B2D_URL_V1_3_0
    ],
    disk.getTempDir(),
    function (err) {
      if (err) throw err;
      console.log('done!');
    }
  );*/

  // Install boot2docker.
    // @todo: find mac volume
    // @todo: check free disk space?
    // @todo: use  osx 'installer' command

};

main();
