'use strict';

var install = require('./install.js');
var framework = install.framework();

exports.run = function(callback) {
  framework.getInstall(process.platform)(callback);
};

exports.getSteps = function() {
  return framework.getSteps(process.platform);
};

exports.events = framework.events;

exports.stepCount = framework.count;

exports.registerStep = framework.registerStep;
