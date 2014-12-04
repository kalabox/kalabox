/**
  * @file
  */

'use strict';

var shell = require('./shell.js'),
  _ = require('lodash'),
  plist = require('plist');

function extractAppData(app, data) {
  var pattern = ' (' + app + '):\n\n[  ]*Version:.*\n';
  var regex = new RegExp(pattern, ['i']);
  var match = data.match(regex);
  if (match && match[1]) {
    return match[1];
  } else {
    return null;
  }
}

module.exports.getAppData = function (app, callback) {
  if (callback === undefined) {
    callback = app;
    app = null;
  }
  var cmd = 'system_profiler SPApplicationsDataType';
  shell.exec(cmd, function (err, data) {
    if (err) {
      callback(err);
    } else {
      if (app) {
        data = extractAppData(app, data);
      }
      callback(null, data);
    }
  });
};

module.exports.isAppInstalled = function (app, callback) {
  this.getAppData(app, function (err, data) {
    callback(err, data !== null);
  });
};
