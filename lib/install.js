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
