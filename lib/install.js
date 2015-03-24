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

exports.run = function(callback) {
  var platform = process.platform;
  var installFunction = framework.getInstall(platform);
  installFunction(callback);
};

exports.events = framework.events;

exports.stepCount = framework.count;

exports.registerStep = framework.registerStep;
