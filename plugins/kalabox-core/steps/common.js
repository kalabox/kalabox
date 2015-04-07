'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox, framework) {

  // Firewall.
  kbox[framework].registerStep(function(step) {
    step.name = 'firewall';
    step.description = 'Check firewall settings.';
    step.deps = [];
    step.subscribes = ['internet'];
    step.all.darwin = function(state, done) {
      state.log('checking firewall settings...');
      kbox.util.firewall.isOkay(function(isOkay) {
        var status = isOkay ? state.status.Ok : state.status.notOk;
        var err = isOkay ? null : new Error('Invalid firewall settings.');
        state.log('status: ' + status);
        done(err);
      });
    };
  });

  // Internet.
  kbox[framework].registerStep(function(step) {
    step.name = 'internet';
    step.description = 'Check for Internet access.';
    step.deps = [];
    step.all = function(state, done) {
      var url = 'www.google.com';
      state.log('checking: ' + url);
      kbox.util.internet.check(url, function(err) {
        var status = err ? state.status.notOk : state.status.Ok;
        state.log('status: ' + status);
        done(err);
      });
    };
  });

  // Disk space.
  kbox[framework].registerStep(function(step) {
    step.name = 'disk-space';
    step.description = 'Check for available disk space.';
    step.deps = [];
    step.all.darwin = function(state, done) {
      state.log('Checking available disk space.');
      kbox.util.disk.getFreeSpace(function(err, freeMbs) {
        if (err) {
          done(err);
        } else {
          var enoughFreeSpace = freeMbs > (1 * 1000);
          var status = enoughFreeSpace ? state.status.Ok : state.status.notOk;
          state.log('status: ' + status);
          if (!enoughFreeSpace) {
            err = new Error('Not enough disk space for install!');
          }
          done(err);
        }
      });
    };
    step.all.linux = function(state, done) {
      state.log('Checking available disk space.');
      kbox.util.disk.getFreeSpace(function(err, freeMbs) {
        if (err) {
          done(err);
        } else {
          var enoughFreeSpace = freeMbs > (1 * 1000);
          var status = enoughFreeSpace ? state.status.Ok : state.status.notOk;
          state.log('status: ' + status);
          if (!enoughFreeSpace) {
            err = new Error('Not enough disk space for install!');
          }
          done(err);
        }
      });
    };
    step.all.win32 = function(state, done) {
      // @todo:
      done();
    };
  });

};
