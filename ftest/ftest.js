var _ = require('lodash');
var async = require('async');
var t = require('./titanic');
var krun = require('./krun');
var ice = require('./iceberg.js');
var path = require('path');
var Promise = require('bluebird');

/*
 * Init the kbox config.
 */
var config = new Promise(function(fulfill, reject) {
  
  krun()
  .run('kbox config', 30).ok()
  .call(function(next) {
    var json = JSON.parse(this.output);
    fulfill(json);
  });

}).timeout(30 * 1000, 'loading config');

/*
 * Get app code directory.
 */
var codeDir = config.then(function(config) {
  return path.join(config.appsRoot, 'foo', 'code');
});

/*
 * Take kbox in any state and fix it.
 */
var restore = function(done) {
  krun()
  // Make sure kbox is in a good state.
  .run('kbox status', 30).ok()
  .call(function(next) {
    if (this.output === 'down\n') {
      krun()
      .run('kbox up', 60).ok()
      .run('kbox status', 30).ok().expect('up\n')
      .done(next);
    } else {
      next();
    }
  })
  // Make sure app is in a good state.
  .call(function(next) {
    krun()
    // Install app.
    .run('kbox apps').ok()
    .call(function(cb) {
      var apps = JSON.parse(this.output);
      var notInstalled = apps.foo.total === 0;
      if (notInstalled) {
        krun()
        .run('kbox foo install', 120).ok()
        .done(cb);
      } else {
        cb();
      }
    })
    // Start app.
    .run('kbox apps').ok()
    .call(function(cb) {
      var apps = JSON.parse(this.output);
      if (apps.foo.running === 0) {
        krun()
        .run('kbox foo start', 180).ok()
        .done(cb);
      } else {
        cb();
      }
    })
    .done(next);
  })
  .done(done);
};

// ACTION: kbox down.
t.addAction(function(done) {
  krun()
  .run('kbox down').ok()
  .call(restore)
  .done(done);  
});

// ACTION: stop app.
t.addAction(function(done) {
  krun()
  .run('kbox foo stop', 60).ok()
  .call(restore)
  .done(done);
});

// ACTION: restart app.
t.addAction(function(done) {
  krun()
  .run('kbox foo restart', 180).ok()
  .done(done);
});

// ACTION: uninstall app.
t.addAction(function(done) {
  krun()
  .run('kbox foo stop', 60).ok()
  .run('kbox foo uninstall').ok()
  .call(restore)
  .done(done);
});

// CHECK: kbox is up.
t.addCheck(function(done) {
  krun()
  .run('kbox status', 30)
  .ok()
  .expect('up\n')
  .done(done);  
});

// CHECK: kbox apps
t.addCheck(function(done) {
  krun().run('kbox apps', 20).ok().done(done);
});

// CHECK: kbox config
t.addCheck(function(done) {
  krun().run('kbox config', 20).ok().done(done);
});

// CHECK: kbox containers
t.addCheck(function(done) {
  krun().run('kbox containers', 20).ok().done(done);
});

// CHECK: kbox ip
t.addCheck(function(done) {
  krun().run('kbox ip', 20).ok().done(done);
});

// CHECK: kbox version
t.addCheck(function(done) {
  krun().run('kbox version', 20).ok().done(done);  
});

// CHECK: app is installed and running.
t.addCheck(function(done) {
  krun()
  .run('kbox apps').ok()
  .call(function(next) {
    var apps = JSON.parse(this.output);
    if (apps.foo.total !== 3 || apps.foo.running !== 2) {
      throw new Error(apps);
    } else {
      next();
    }
  })
  .done(done);
});

var addSyncthingCheck = function(inSeries) {

  // CHECK: syncthing test
  t.addCheck(function(done) {

    var tests = _.random(1, 10);

    var shouldContinue = function() {
      tests -= 1;
      return tests === 0;  
    };

    var test = function(next) {
      config.then(function(config) {
        var dir = path.join(config.appsRoot, 'foo', 'code');
        return ice.local(dir)
        .init()
        .toRemote('kb_foo_appserver')
        .untilEqual(30)
        .remove()
        .exists()
        .call(function(done) {
          if (this.exists) {
            throw new Error('file still exists!');
          }
          done();
        })
        .promise();
      })
      .timeout(120 * 1000, 'while testing syncthing')
      .done(next, next);
    };

    if (inSeries) {
      async.doUntil(test, shouldContinue, done);
    } else {
      var testsToRun = _.fill(Array(tests), test);
      async.parallel(testsToRun, done);
    }

  });

};

// CHECK: syncthing in series check
addSyncthingCheck(true);

// CHECK: syncthing in parallel check
addSyncthingCheck(false);

// CHECK: file editing
t.addCheck(function(done) {

  var maxTimes = 5;

  var timeout = 15;

  var test = function(next) {
    codeDir.then(function(dir) {
      return ice.local(dir)
      .init()
      .toRemote('kb_foo_appserver')
      .untilEqual(45)
      .edit()
      .untilEqual(timeout)
      .edit()
      .untilEqual(timeout)
      .edit()
      .untilEqual(timeout)
      .remove()
      .exists()
      .call(function(done) {
        if (this.exists) {
          throw new Error('file still exists!');
        }
        done();
      })
      .promise();
    })
    .done(next, next);
  };

  async.timesSeries(_.random(1, maxTimes),
  function(n, next) {
    test(next);     
  },
  done);
});

var runs = 1;
var cursor = 0;

var keepGoing = function() {

  cursor += 1;
  return cursor <= runs;

};

restore(function(err) {

  if (err) {
    throw err;
  }

  t.run(keepGoing, function(err) {

    if (err) {
      console.log('there was an error :(');
      throw err;
    }

    console.log('finished testing!!!');
    
  });
  
});
