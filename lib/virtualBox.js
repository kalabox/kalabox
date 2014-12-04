/**
  * @file
  */

'use strict';

var shell = require('./shell.js');

function isRunningRaw(data) {
  var match = data.match(/(VirtualBox.app)/);
  var isRunning = match && match[1] ? match[1] === 'VirtualBox.app' : false;
  return isRunning;
};

function isRunning(callback) {
  shell.psAll(function (err, data) {
    callback(err, isRunningRaw(data));
  });
};

module.exports = {
  isRunningRaw: isRunningRaw,
  isRunning: isRunning
};
