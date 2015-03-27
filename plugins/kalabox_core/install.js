'use strict';

var chalk = require('chalk');

module.exports = function(kbox) {

  var ok = chalk.green('OK');

  var notOk = chalk.red('NOT OK');

  // Firewall.
  kbox.install.registerStep(function(step) {
    step.name = 'firewall';
    step.description = 'Check firewall settings.';
    step.deps = [];
    step.subscribes = ['internet'];
    step.all.darwin = function(state, done) {
      state.log('checking firewall settings...');
      kbox.util.firewall.isOkay(function(isOkay) {
        var status = isOkay ? ok : notOk;
        var err = isOkay ? null : new Error('Invalid firewall settings.');
        state.log('status: ' + status);
        done(err);
      });
    };
  });

  // Internet.
  kbox.install.registerStep(function(step) {
    step.name = 'internet';
    step.description = 'Check for Internet access.';
    step.deps = [];
    step.all = function(state, done) {
      var url = 'www.google.com';
      state.log('checking: ' + url);
      kbox.util.internet.check(url, function(err) {
        var status = err ? notOk : ok;
        state.log('status: ' + status);
        done(err);
      });
    };
  });

  // Disk space.
  kbox.install.registerStep(function(step) {
    step.name = 'disk-space';
    step.description = 'Check for available disk space.';
    step.deps = [];
    step.all = function(state, done) {
      state.log('Checking available disk space.');
      kbox.util.disk.getFreeSpace(function(err, freeMbs) {
        if (err) {
          done(err);
        } else {
          var enoughFreeSpace = freeMbs > (1 * 1000);
          var status = enoughFreeSpace ? ok : notOk;
          state.log('status: ' + status);
          if (!enoughFreeSpace) {
            err = new Error('Not enough disk space for install!');
          }
          done(err);
        }
      });
    };
  });

  // Downloads.
  kbox.install.registerStep(function(step) {
    step.name = 'downloads';
    step.description = 'Download intallation files.';
    step.deps = ['disk-space', 'internet'];
    step.all = function(state, done) {
      if (state.downloads && state.downloads.length > 0) {
        state.downloadDir = kbox.util.disk.getTempDir();
        state.downloads.forEach(function(url) {
          state.log([url, state.downloadDir].join(' -> '));
        });
        var downloadFiles = kbox.util.download.downloadFiles;
        downloadFiles(state.downloads, state.downloadDir, function(err) {
          if (err) {
            state.log(state.status.notOk);
            done(err);
          } else {
            state.log(state.status.ok);
            done();
          }
        });
      } else {
        done();
      }
    };
  });

  // Run administator commands.
  kbox.install.registerStep(function(step) {
    step.name = 'run-admin-commands';
    step.description = 'Run shell commands as adminstrator.';
    step.all.darwin = function(state, done) {
      if (state.adminCommands.length > 0) {
        var child = kbox.install.cmd.runCmdsAsync(state.adminCommands);
        child.stdout.on('data', function(data) {
          state.log(data);
        });
        child.stdout.on('end', function() {
          done();
        });
        child.stderr.on('data', function(data) {
          done(new Error(data));
        });
      } else {
        done();
      }
    };
  });

};
