'use strict';

// @todo: probably would be easy to get away with this?

// Kalabox modules
var util = require('../util.js');
var shell = util.shell;

exports.runCmdsAsync = function(cmds, options) {
  // @todo: this is jank and not sure if works on windows?
  var cmd = cmds.join(' && ');
  return shell.execAdminAsync(cmd, options);
};

exports.runCmds = function(cmds, callback) {
  // @todo: this is jank and not sure if works on windows?
  shell.execAdmin(cmds, function(err, output) {
    callback(err, output);
  });
};
