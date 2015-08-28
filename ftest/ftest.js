var _ = require('lodash');
var async = require('async');
var t = require('./titanic');
var Krun = require('./krun');
var ice = require('./iceberg.js');
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var pp = require('util').inspect;
var argv = require('yargs').argv;
var randomstring = require('randomstring');
var VError = require('verror');

var KBOX_EXE = path.resolve('bin/kbox.js');

/*
 * Init the kbox config.
 */
var config = _.once(function() {

  return Krun()
  .run([KBOX_EXE, 'config'], 20)
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
  .run([KBOX_EXE, 'status'], 30).ok()
  .then(function() {
    if (this.output === 'down\n') {
      return Krun()
      .run([KBOX_EXE, 'up'], 60).ok()
      .run([KBOX_EXE, 'status'], 30).ok().expect('up\n')
      .promise();
    }
  })
  .then(function() {
    return Promise.each(apps, function(app) {
      return Krun()
      .run([KBOX_EXE, 'apps']).ok()
      .json(function(apps) {
        var notInstalled = !apps[app] || apps[app].total === 0;
        if (notInstalled) {
          return Krun()
          .run([KBOX_EXE, app, 'install'], 240).ok()
          .promise();
        }
      })
      .run([KBOX_EXE, 'apps']).ok()
      .json(function(apps) {
        if (apps[app].running === 0) {
          return Krun()
          .run([KBOX_EXE, app, 'start', '--', '-v'], 180).ok()
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
  .run([KBOX_EXE, 'down']).ok()
  .then(restore)
  .promise();
});

// ACTION: stop app.
t.addAction(function() {
  return Krun()
  .run([KBOX_EXE, randomApp(), 'stop', '--', '-v'], 180).ok()
  .then(restore)
  .promise();
});

// ACTION: restart app.
t.addAction(function() {
  return Krun()
  .run([KBOX_EXE, randomApp(), 'restart', '--', '-v'], 180).ok()
  .promise();
});

// ACTION: uninstall app.
t.addAction(function() {
  var app = randomApp();
  return Krun()
  .run([KBOX_EXE, app, 'stop', '--', '-v'], 90).ok()
  .run([KBOX_EXE, app, 'uninstall', '--']).ok()
  //.run([KBOX_EXE, app, 'uninstall', '--', '-p']).ok()
  .then(restore)
  .promise();
});

// CHECK: syncthing share ignores
t.addCheck(function() {
  return config()
  .then(function(config) {
    // Pick a random ignore pattern.
    var ignores = config.shareIgnores;
    var pattern = ignores[_.random(1, ignores.length) - 1];
    // Make sure the ignore list is sane.
    if (ignores.length < 12) {
      throw new Error('Unexpected number of shareIgnores.');
    }
    // Replace wild card with a random string.
    if (_.contains(pattern, '*')) {
      pattern = pattern.replace('*', randomstring.generate(5));
    }
    // Build helper variables.
    var app = randomApp();
    var dir = path.join(config.appsRoot, app, 'code');
    var container = ['kb', app, 'appserver'].join('_');
    var filepath = path.join(dir, pattern);
    // Create file locally.
    return Krun().run(['touch', filepath]).promise()
    .then(function() {
      // Create local;
      var local = ice.Local(filepath).init();
      return local.promise()
      // Wait 60 seconds to see if the file syncs over.
      // Output message that we are waiting, so humans following along don't
      // think everything has gotten stuck.
      .then(function() {
        console.log('waiting...');
      })
      .delay(90 * 1000)
      // Check to make sure the remote file does not exist.
      .then(function() {
        return local
        .toRemote(container)
        .then(function() {
          var remote = this.state.remote;
          return remote.exists()
          .then(function() {
            var self = this;
            if (self.state.exists) {
              throw new Error('Expected file to NOT sync.');
            } else {
              console.log('File did not sync as expected.');
            }
          })
          .promise();
        })
        .promise();
      })
      .catch(function(err) {
        throw new VError(err, filepath);
      });
    });

  });
});

// CHECK: kbox is up.
t.addCheck(function() {
  return Krun()
  .run([KBOX_EXE, 'status'], 30).ok()
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
  .run([KBOX_EXE, 'apps'], 20)
  .ok()
  .promise();
});

// CHECK: kbox config
t.addCheck(function() {
  return Krun()
  .run([KBOX_EXE, 'config'], 20)
  .ok()
  .promise();
});

// CHECK: kbox containers
t.addCheck(function() {
  return Krun()
  .run([KBOX_EXE, 'containers'], 20)
  .ok()
  .promise();
});

// CHECK: kbox ip
t.addCheck(function() {
  return Krun()
  .run([KBOX_EXE, 'ip'], 20)
  .ok()
  .promise();
});

// CHECK: kbox version
t.addCheck(function() {
  return Krun()
  .run([KBOX_EXE, 'version'], 20)
  .ok()
  .expect('0.9.0\n')
  .promise();
});

// CHECK: app is installed and running.
t.addCheck(function() {
  return Krun()
  .run([KBOX_EXE, 'apps']).ok()
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

// CHECK: code file exists.
t.addCheck(function() {
  return Promise.each(apps, function(app) {
    return config()
    .then(function(config) {
      var filepath = path.join(config.appsRoot, app, 'code', 'testFile.txt');
      if (!fs.existsSync(filepath)) {
        throw new Error('File does not exist: ' + filepath);
      }
    });
  });
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
        .untilEqual(45)
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

  var timeout = 45;

  var test = function() {
    return codeDir(app).then(function(dir) {
      return ice.Local(dir)
      .init()
      .toRemote('kb_' + app + '_appserver')
      .untilEqual(90)
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
  console.log('#################################');
  console.log('#################################');
  console.log(' $$$$$ Finished testing!!! $$$$$');
  console.log('#################################');
  console.log('#################################');
})
.catch(function(err) {
  throw err;
});
