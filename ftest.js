var t = require('./titanic');
var krun = require('./krun');

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

/*
 * Add a simple check that just runs a command and expects an ok.
 */
var addSimpleCheck = function(cmd, timeout) {
  t.addCheck(function(done) {
    krun().run(cmd, timeout).ok.done(done);
  });
};

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
  krun().run('kbox apps', 20).ok.done(done);
});

// CHECK: kbox config
t.addCheck(function(done) {
  krun().run('kbox config', 20).ok.done(done);
});

// CHECK: kbox containers
t.addCheck(function(done) {
  krun().run('kbox containers', 20).ok.done(done);
});

// CHECK: kbox ip
t.addCheck(function(done) {
  krun().run('kbox ip', 20).ok.done(done);
});

// CHECK: kbox version
t.addCheck(function(done) {
  krun().run('kbox version', 20).ok.done(done);  
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

var runs = 20;
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
      throw err;
    }
    
  });
  
});
