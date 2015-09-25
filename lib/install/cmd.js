'use strict';

// Native modules
var path = require('path');

// Npm Modules
var _ = require('lodash');

// Kalabox modules
var util = require('../util.js');
var shell = util.shell;

var esc = function(s) {
  if (process.platform === 'win32') {
    return s.replace(/ /g, '^ ');
  }
  if (process.platform === 'darwin') {
    var parts = s.split(path.sep);
    _.each(parts, function(part, key) {
      if (part.indexOf(' ') > -1) {
        parts[key] = '\\"' + part +  '\\"';
      }
    });
    return parts.join(path.sep);
  }
  else {
    return s.replace(/ /g, '\\ ');
  }
};

var buildInstallCmdLinux = function(pkg, osInfo) {
  if (osInfo.ID === 'debian' || osInfo.ID_LIKE === 'debian') {
    return 'dpkg -i ' + esc(pkg);
  }
  else {
    return 'rpm -Uvh ' + esc(pkg);
  }
};

var buildInstallCmdDarwin = function(pkg, targetVolume) {
  return 'installer -verbose -pkg ' + esc(pkg) +
    ' -target ' + targetVolume;
};

var buildInstallCmdWin32 = function(pkg, inf) {
  // @todo: what if we have an MSI?
  return esc(pkg) +
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

var buildDnsCmdWin32 = function(ips, data) {
  var cmds = [];
  _.each(ips, function(ip) {
    cmds.push(
      'netsh interface ipv4 add dnsservers "' + data[0] + '" ' + ip +
      ' validate=no'
    );
  });
  cmds.push('ipconfig /flushdns');
  return cmds;
};

var buildDnsCmdDarwin = function(ips, data) {
  var cmds = [];
  cmds.push(['mkdir -p', data[0]].join(' '));
  var dnsFile = data.join(path.sep);
  _.each(ips, function(ip) {
    cmds.push('echo \'"nameserver ' + ip + '"\' >> ' + dnsFile);
  });
  return cmds;
};

var buildDnsCmdLinux = function(ips, data) {
  var cmds = [];
  cmds.push(['mkdir -p', data[0]].join(' '));
  var dnsFile = data.join(path.sep);
  _.each(ips, function(ip) {
    cmds.push('echo \'"' + ip + '"\' >> ' + dnsFile);
  });
  return cmds;
};

exports.buildDnsCmd = function(ips, data) {
  if (process.platform === 'win32') {
    return buildDnsCmdWin32(ips, data);
  }
  if (process.platform === 'darwin') {
    return buildDnsCmdDarwin(ips, data);
  }
  else {
    return buildDnsCmdLinux(ips, data);
  }
};

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
