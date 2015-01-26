/**
  * @file
  */

'use strict';

var _ = require('lodash');

var util = require('../util.js');
var shell = util.shell;
var core = require ('../core.js');
var deps = core.deps;

exports.buildInstallCmd = function(pkg, targetVolume) {
  // @todo: make cross platform
  var cmd = 'installer -verbose -pkg ' + pkg + ' -target ' + targetVolume;
  return cmd;
};

exports.buildDnsCmd = function(ips, path) {
  // @todo: make cross platform
  // @todo: This should be in the provider somewhere
  var cmds = [];
  _.each(ips, function(ip) {
    cmds.push('echo \'"nameserver ' + ip + '"\' >> ' + path);
  });
  return cmds;
};

exports.buildExportsLine = function(share, ips) {
  // @todo: make cross platform
  // @todo: This should be in the provider somewhere
  // sudo sh -c 'echo "127.0.0.1\twpad.company.com\n" >> /etc/hosts'
  var line = [share, ips.join(' '), '-alldirs', '-mapall=501:20'].join(' ');
  return line;
};

exports.buildExportsCmd = function(line, path) {
  // @todo: make cross platform
  // @todo: This should be in the provider somewhere
  return 'echo \'"' + line + '"\' >> ' + path;
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
