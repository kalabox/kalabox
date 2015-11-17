'use strict';

// Native modules
var path = require('path');

// Npm Modules
var _ = require('lodash');

// Kalabox modules
var util = require('../util.js');
var shell = util.shell;

var buildDnsCmdWin32 = function(ips, data) {
  var cmds = [];
  var counter = 1;
  _.each(ips, function(ip) {
    cmds.push(
      'netsh interface ipv4 add dnsservers "' + data[0] + '" ' + ip +
      ' validate=no index=' + counter
    );
    counter = counter + 1;
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
