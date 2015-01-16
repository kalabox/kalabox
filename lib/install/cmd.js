/**
  * @file
  */

'use strict';

var util = require('../util.js');
var shell = util.shell;

exports.buildInstallCmd = function(pkg, targetVolume) {
  // @todo: make cross platform
  var cmd = 'installer -verbose -pkg ' + pkg + ' -target ' + targetVolume;
  return cmd;
};

exports.buildDnsCmd = function(path) {
  // @todo: make cross platform
  var cmd = 'echo \'"nameserver 1.3.3.7"\' > ' + path;
  return cmd;
};

exports.runCmdsAsync = function(cmds) {
  // @todo: this is jank and not sure if works on windows?
  var cmd = cmds.join(' && ');
  return shell.execAdminAsync(cmd);
};

exports.runCmds = function(cmds, callback) {
  // @todo: this is jank and not sure if works on windows?
  var cmd = cmds.join(' && ');
  shell.execAdmin(cmd, function(err, output) {
    callback(err, output);
  });
};
