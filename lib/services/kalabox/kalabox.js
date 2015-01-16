'use strict';

/**
 * Kalabox lib -> services -> kbox module.
 * @module kbox
 */

var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var core = require('./../../core.js');
var util = require('./../../util.js');
var helpers = util.helpers;
var engine = require('./../../engine.js');
var serviceInfo = require('./services.js');

var serviceStatus = function(service, callback) {
  var cid = serviceInfo.getCid(service);
  if (cid !== false) {
    engine.inspect(cid, function(err, data) {
      if (err) {
        callback(err, false);
      }
      else {
        callback(null, data);
      }
    });
  }
  else {
    callback(null, false);
  }
};

var isNotRunning = function(service, callback) {
  var cid = serviceInfo.getCid(service);
  if (cid !== false) {
    engine.inspect(cid, function(err, data) {
      if (err) {
        callback(err, false);
      }
      else {
        callback(null, !data.State.Running);
      }
    });
  }
  else {
    callback(null, false);
  }
};

var installService = function(service, callback) {
  engine.build(service, function(err) {
    if (err) {
      callback(err);
    } else {
      if (service.createOpts) {
        serviceStatus(service, function(err, data) {
          if (err) {
            callback(err);
          }
          if (!data) {
            var installOptions = serviceInfo.getInstallOptions(service);
            engine.create(installOptions, function(err, container) {
              if (err) {
                throw err;
              }
              if (container) {
                console.log('installOptions: ' + JSON.stringify(installOptions));
                fs.writeFileSync(serviceInfo.getCidFile(service), container.cid);
                callback(err);
              }
            });
          }
          else {
            callback(null);
          }
        });
      }
      else {
        callback(null);
      }
    }
  });
};

var verifyServiceInstalled = function(service, callback) {
  serviceStatus(service, function(err, data) {
    if (err) {
      callback(err);
    }
    if (!data) {
      var installOptions = serviceInfo.getInstallOptions(service);
      engine.create(installOptions, function(err, container) {
        if (err) {
          throw err;
        }
        if (container) {
          console.log('installOptions: ' + JSON.stringify(installOptions));
          fs.writeFileSync(serviceInfo.getCidFile(service), container.cid);
          callback(err);
        }
      });
    }
    else {
      callback(null);
    }
  });
};

var startService = function(service, callback) {
  var opts = serviceInfo.getStartOptions(service);
  var cid = serviceInfo.getCid(service);
  engine.start(cid, opts, function(err) {
    callback(err);
  });
};

var stopService = function(service, callback) {
  var cid = serviceInfo.getCid(service);
  engine.stop(cid, function(err) {
    callback(err);
  });
};

var start = function(callback) {
  helpers.mapAsync(
    serviceInfo.getStartableServices(),
    function(service, done) {
      startService(service, done);
    },
    function(errs) {
      callback(errs);
    }
  );
};

var halt = function(callback) {
  helpers.mapAsync(
    serviceInfo.getStartableServices(),
    function(service, done) {
      stopService(service, done);
    },
    function(errs) {
      callback(errs);
    }
  );
};

var rebootServices = function(callback) {
  console.log('Startup services need to be restarted!');
  halt(function(err) {
    start(function(err) {
      callback(null);
    });
  });
};

exports.install = function(callback) {
  var cidRoot = serviceInfo.getCidRoot();
  if (!fs.existsSync(cidRoot)) {
    mkdirp.sync(cidRoot);
  }
  helpers.mapAsync(
    serviceInfo.getCoreImages(),
    function(service, done) {
      installService(service, done);
    },
    function(errs) {
      callback(errs);
    }
  );
};

exports.verify = function(callback) {
  helpers.findAsync(
    serviceInfo.getStartableServices(),
    function(service, done) {
      isNotRunning(service, done);
    },
    function(errs, result) {
      if (errs) {
        callback(errs);
      }
      else if (result) {
        rebootServices(callback);
      }
      else {
        callback(null);
      }
    }
  );
};
