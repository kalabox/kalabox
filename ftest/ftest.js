var _ = require('lodash');
var async = require('async');
var t = require('./titanic');
var Krun = require('./krun');
var ice = require('./iceberg.js');
var path = require('path');
var Promise = require('bluebird');
var pp = require('util').inspect;
var argv = require('yargs').argv;

/*
 * Init the kbox config.
 */
var config = _.once(function() {

  return Krun()
  .run('kbox config', 20)
  .ok()
  .json()
  .timeout(30 * 1000);

});

/*
 * List of apps to test.
 */
var apps = [
  'foo',
  'bar'
];

/*
 * Return a random app.
 */
var randomApp = function() {
  return apps[_.random(1, apps.length) - 1];
};

/*
 * Get app code directory.
 */
var codeDir = function(app) {
  return config().then(function(config) {
    return path.join(config.appsRoot, app, 'code');
  });
};

/*
 * Take kbox in any state and fix it.
 */
var restore = function() {
  return Krun()
  .run('kbox status', 30).ok()
  .then(function() {
    if (this.output === 'down\n') {
      return Krun()
      .run('kbox up', 60).ok()
      .run('kbox status', 30).ok().expect('up\n')
      .promise();
    }
  })
  .then(function() {
    return Promise.each(apps, function(app) {
      return Krun()
      .run('kbox apps').ok()
      .json(function(apps) {
        var notInstalled = !apps[app] || apps[app].total === 0;
        if (notInstalled) {
          return Krun()
          .run(['kbox', app, 'install'], 240).ok()
          .promise();
        }
      })
      .run('kbox apps').ok()
      .json(function(apps) {
        if (apps[app].running === 0) {
          return Krun()
          .run(['kbox', app, 'start', '--', '-v'], 180).ok()
          .promise();
        }
      })
    });
  })
  .promise();
};

// ACTION: kbox down.
t.addAction(function() {
  return Krun()
  .run('kbox down').ok()
  .then(restore)
  .promise();
});

// ACTION: stop app.
t.addAction(function() {
  return Krun()
  .run(['kbox', randomApp(), 'stop', '--', '-v'], 180).ok()
  .then(restore)
  .promise();
});

// ACTION: restart app.
t.addAction(function() {
  return Krun()
  .run(['kbox', randomApp(), 'restart', '--', '-v'], 180).ok()
  .promise();
});

// ACTION: uninstall app.
t.addAction(function() {
  var app = randomApp();
  return Krun()
  .run(['kbox', app, 'stop', '--', '-v'], 90).ok()
  .run(['kbox', app, 'uninstall', '--', '-p']).ok()
  .then(restore)
  .promise();
});

// CHECK: kbox is up.
t.addCheck(function() {
  return Krun()
  .run('kbox status', 30).ok()
  .expect('up\n')
  .promise();
});

// CHECK: check DNS.
t.addCheck(function() {
  return Promise.each(apps, function(app) {
    var address = ['http://', app, '.kbox'].join('');
    return Krun()
    .run(['curl', '-s', address])
    .ok()
    .expect('No input file specified.\n')
    .promise();
  });
});

// CHECK: kbox apps
t.addCheck(function() {
  return Krun()
  .run('kbox apps', 20)
  .ok()
  .promise();
});

// CHECK: kbox config
t.addCheck(function() {
  return Krun()
  .run('kbox config', 20)
  .ok()
  .promise();
});

// CHECK: kbox containers
t.addCheck(function() {
  return Krun()
  .run('kbox containers', 20)
  .ok()
  .promise();
});

// CHECK: kbox ip
t.addCheck(function() {
  return Krun()
  .run('kbox ip', 20)
  .ok()
  .promise();
});

// CHECK: kbox version
t.addCheck(function() {
  return Krun()
  .run('kbox version', 20)
  .ok()
  .expect('0.8.0\n')
  .promise();
});

// CHECK: app is installed and running.
t.addCheck(function() {
  return Krun()
  .run('kbox apps').ok()
  .json(function(appInfo) {
    var notRunning = _.find(apps, function(app) {
      if (appInfo[app].total !== 2 || appInfo[app].running !== 2) {
        return true;
      } else {
        return false;
      }
    });
    if (notRunning) {
      throw new Error('App is not running: ' + pp(notRunning));
    }
  })
  .promise();
});

var addSyncthingCheck = function(inSeries) {

  // CHECK: syncthing test
  t.addCheck(function() {

    var app = randomApp();

    var numOfTests = _.random(1, 10);

    var tests = _.fill(Array(numOfTests), null);

    var test = function() {
      return config()
      .then(function(config) {
        var dir = path.join(config.appsRoot, app, 'code');
        return ice.Local(dir)
        .init()
        .toRemote(['kb', app, 'appserver'].join('_'))
        .untilEqual(30)
        .remove()
        .then(function() {
          return Promise.delay(10 * 1000);
        })
        .then(function() {
          var self = this;
          self.state.remote.hash()
          .exists()
          .then(function() {
            if (this.state.exists) {
              throw new Error('File still exists: ' + this.filepath);
            }
          });
        })
        .promise();
      })
      .timeout(90 * 1000, 'while testing syncthing');
    };

    var opts = inSeries ? {concurrency: 1} : {};

    return Promise.map(tests, function() {
      return test();
    }, opts);

  });

};

// CHECK: syncthing in series check
addSyncthingCheck(true);

// CHECK: syncthing in parallel check
//addSyncthingCheck(false);

// CHECK: file editing
t.addCheck(function() {

  var app = randomApp();

  var maxTimes = 5;

  var timeout = 30;

  var test = function() {
    return codeDir(app).then(function(dir) {
      return ice.Local(dir)
      .init()
      .toRemote('kb_' + app + '_appserver')
      .untilEqual(60)
      .edit()
      .untilEqual(timeout)
      .edit()
      .untilEqual(timeout)
      .edit()
      .untilEqual(timeout)
      .remove()
      .then(function() {
        return Promise.delay(10 * 1000);
      })
      .then(function() {
        var self = this;
        self.state.remote.hash()
        .exists()
        .then(function() {
          if (this.state.exists) {
            throw new Error('File still exists: ' + this.filepath);
          }
        });
      })
      .promise();
    });
  };

  var numOfTests = _.random(1, 10);

  var tests = _.fill(Array(numOfTests), null);

  return Promise.map(tests, function() {
    return test();
  });

});

var runs = argv.n || 1;
var cursor = 0;

var keepGoing = function() {

  cursor += 1;
  return cursor <= runs;

};

restore()
.then(function() {
  return t.run(keepGoing);
})
.then(function() {
  console.log('Finished testing!!!');
})
.catch(function(err) {
  throw err;
});
