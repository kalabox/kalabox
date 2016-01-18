/**
 * Module to help with some DNS things
 * @module kbox.util.dns
 */

'use strict';

// node modules
var path = require('path');

// npm modules
var _ = require('lodash');
var fs = require('fs-extra');
var esc = require('shell-escape');

/*
 * Helper command to build win32 dns command
 */
var dnsCmdWin32 = function(ips, data) {

  // COmmand collector
  var cmds = [];

  _.each(ips, function(ip) {
    cmds = cmds.concat([
      'netsh',
      'interface',
      'ipv4',
      'add',
      'dnsservers',
      data[0],
      ip,
      'validate=no',
      'index=1'
    ]);
  });
  cmds = cmds.concat(['ipconfig', '/flushdns']);
  return esc(cmds);
};

/*
 * Helper command to build darwin dns command
 */
var dnsCmdPosix = function(ips, data, postIp) {

  // Create the directory
  fs.mkdirpSync(data[0]);

  // Get the dnsFile
  var dnsFile = data.join(path.sep);

  // Command collector
  var cmds = [];

  _.each(ips, function(ip) {
    cmds = cmds.concat([
      'echo',
      '"nameserver ' + ip + postIp + '"',
      '>>',
      esc(dnsFile)
    ]);
  });

  return cmds.join(' ');

};

/*
 * Helper command to build darwin dns command
 */
var dnsCmdDarwin = function(ips, data) {
  return dnsCmdPosix(ips, data, '');
};

/*
 * Helper command to build linux dns command
 */
var dnsCmdLinux = function(ips, data) {
  return dnsCmdPosix(ips, data, ':53');
};

/**
 * Returns a command to add DNS
 * @arg {string} ips - The ips to add
 * @arg {string} data - Other stuff
 * @todo: this only handles one ip right now
 */
exports.dnsCmd = function(ips, data) {

  // Return path based on platform
  switch (process.platform) {
    case 'win32': return dnsCmdWin32(ips, data);
    case 'darwin': return dnsCmdDarwin(ips, data);
    case 'linux': return dnsCmdLinux(ips, data);
  }

};
