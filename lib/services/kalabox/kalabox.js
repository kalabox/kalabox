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
var helper = require('./services.js');

var verifyCreated = function(service, callback) {
  var cid = helper.getCid(service);
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

var installService = function(service, callback) {
  engine.build(service, function(err) {
    if (err) {
      callback(err);
    } else {
      if (service.createOpts) {
        verifyCreated(service, function(err, data) {
          if (err) {
            callback(err);
          }
          if (!data) {
            var installOptions = helper.getInstallOptions(service);
            engine.create(installOptions, function(err, container) {
              if (err) {
                throw err;
              }
              if (container) {
                console.log('installOptions: ' + JSON.stringify(installOptions));
                fs.writeFileSync(helper.getCidFile(service), container.cid);
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

var startService = function(service, callback) {
  var opts = helper.getStartOptions(service);
  var cid = helper.getCid(service);
  engine.start(cid, opts, function(err) {
    callback(err);
  });
};

exports.start = function(callback) {
  helpers.mapAsync(
    helper.getStartableServices(),
    function(service, done) {
      startService(service, done);
    },
    function(errs) {
      callback(errs);
    }
  );
};

exports.install = function(callback) {
  var cidRoot = helper.getCidRoot();
  if (!fs.existsSync(cidRoot)) {
    mkdirp.sync(cidRoot);
  }
  helpers.mapAsync(
    helper.getCoreImages(),
    function(service, done) {
      installService(service, done);
    },
    function(errs) {
      callback(errs);
    }
  );
};
