'use strict';

/*
 * Kalabox core module.
 */

var cmd = require('./install/cmd.js');
exports.cmd = cmd;

var framework = exports.framework = require('./install/framework.js');

var installFramework = framework();

var sysProfiler = require('./install/sysprofiler.js');
exports.sysProfiler = sysProfiler;

var vb = require('./install/virtualBox.js');
exports.vb = vb;

var linuxOsInfo = require('./install/linuxOsInfo.js');
exports.linuxOsInfo = linuxOsInfo;

exports.run = function(callback) {
  var installFunction = installFramework.getInstall(process.platform);
  installFunction(callback);
};

exports.getSteps = function() {
  return installFramework.getSteps(process.platform);
};

exports.events = installFramework.events;

exports.stepCount = installFramework.count;

exports.registerStep = installFramework.registerStep;
