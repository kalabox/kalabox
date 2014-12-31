/**
  * @file
  */

'use strict';

var shell = require('./shell.js');
var _ = require('lodash');
var plist = require('plist');

exports.isBlockingAll = function(callback) {
  var cmd = '/usr/libexec/ApplicationFirewall/socketfilterfw --getblockall';
  shell.exec(cmd, function(err, data) {
    if (err) {
      callback(err);
    } else if (data === 'Block all DISABLED! \n') {
      callback(null, false);
    } else {
      callback(null, data);
    }
  });
};

exports.isOkay = function(callback) {
  this.isBlockingAll(function(isBlockingAll) {
    callback(!isBlockingAll);
  });
};
