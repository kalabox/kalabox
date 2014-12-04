/**
  * @file
  */

'use strict';

var shell = require('./shell.js'),
  os = require('os'),
  diskspace = require('diskspace');

module.exports.getMacVolume = function (callback) {
  var cmd = 'diskutil info /';
  shell.exec(cmd, function (err, data) {
    if (err) {
      callback(err);
    } else {
      var match = data.match(/Volume UUID:[ ]*(.*)\n/);
      if (match && match[1]) {
        callback(null, match[1]);
      } else {
        callback(new Error('Mac volume NOT found!'), data);
      }
    }
  });
};

module.exports.getTempDir = function () {
  return '/tmp';
};

module.exports.getFreeSpace = function (callback) {
  var volume = '/';
  diskspace.check(volume, function (err, total, free, status) {
    free = free / 1024 / 1024;
    if (err === null && status !== 'READY') {
      err = new Error('Diskspace error "' + status + '" on volume "' + volume + '"');
    }
    callback(err, free);
  });
};
