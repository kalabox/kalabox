'use strict';

/*
 * Kalabox core module.
 */

var cmd = require('./install/cmd.js');
exports.cmd = cmd;

var framework = exports.framework = require('./install/framework.js');

var sysProfiler = require('./install/sysprofiler.js');
exports.sysProfiler = sysProfiler;

var vb = require('./install/virtualBox.js');
exports.vb = vb;

var linuxOsInfo = require('./install/linuxOsInfo.js');
exports.linuxOsInfo = linuxOsInfo;

exports.run = function(callback) {
  var installFunction = framework.getInstall(process.platform);
  installFunction(callback);
};

exports.getSteps = function() {
  return framework.getSteps(process.platform);
};

exports.events = framework.events;

exports.stepCount = framework.count;

exports.registerStep = framework.registerStep;
