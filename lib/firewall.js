/**
  * @file
  */

'use strict';

var shell = require('./shell.js'),
  _ = require('lodash'),
  plist = require('plist');

module.exports.isBlockingAll = function (callback) {
  var cmd = '/usr/libexec/ApplicationFirewall/socketfilterfw --getblockall';
  shell.exec(cmd, function (err, data) {
    if (err) {
      callback(err);
    } else if (data === 'Block all DISABLED! \n') {
      callback(null, false);
    } else {
      callback(null, data);
    }
  });
};

module.exports.isOkay = function (callback) {
  this.isBlockingAll(function (isBlockingAll) {
    callback(!isBlockingAll);
  });
};
