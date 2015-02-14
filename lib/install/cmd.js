/**
  * @file
  */

'use strict';

var _ = require('lodash');

var util = require('../util.js');
var path = require('path');
var shell = util.shell;

var buildInstallCmdLinux = function(pkg, osInfo) {
  if (osInfo.ID === 'debian' || osInfo.ID_LIKE === 'debian') {
    return 'dpkg -i ' + pkg;
  }
  else {
    return 'rpm -Uvh ' + pkg;
  }
};

var buildInstallCmdDarwin = function(pkg, targetVolume) {
  return 'installer -verbose -pkg ' + pkg + ' -target ' + targetVolume;
};

var buildInstallCmdWin32 = function(pkg, inf) {
  // @todo: what if we have an MSI?
  return pkg +
    ' \'/SP /SILENT /VERYSILENT /SUPRESSMSGBOXES /NOCANCEL /NOREBOOT ' +
    '/NORESTART /CLOSEAPPLICATIONS /LOADINF="' + inf + '"\'';
};

exports.buildInstallCmd = function(pkg, data) {
  if (process.platform === 'win32') {
    return buildInstallCmdWin32(pkg, data);
  }
  else if (process.platform === 'darwin') {
    return buildInstallCmdDarwin(pkg, data);
  }
  else {
    return buildInstallCmdLinux(pkg, data);
  }
};

exports.buildDnsCmd = function(ips, dir, file) {
  // @todo: make cross platform
  // @todo: This should be in the provider somewhere
  var cmds = [];
  cmds.push(['mkdir -p', dir].join(' '));
  _.each(ips, function(ip) {
    cmds.push('echo \'"nameserver ' + ip + '"\' >> ' + path.join(dir, file));
  });
  return cmds;
};

exports.runCmdsAsync = function(cmds) {
  // @todo: this is jank and not sure if works on windows?
  var cmd = cmds.join(' && ');
  return shell.execAdminAsync(cmd);
};

exports.runCmds = function(cmds, callback) {
  // @todo: this is jank and not sure if works on windows?
  shell.execAdmin(cmds, function(err, output) {
    callback(err, output);
  });
};
