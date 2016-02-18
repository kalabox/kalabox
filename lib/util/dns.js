/**
 * Module to help with some DNS things
 * @name dns
 */

'use strict';

// node modules
var path = require('path');

// npm modules
var esc = require('shell-escape');

/*
 * Helper command to build win32 dns command
 */
var dnsCmdWin32 = function(ip, data) {

  // Config command
  var config = esc([
    'netsh',
    'interface',
    'ipv4',
    'add',
    'dnsservers',
    data,
    ip,
    'validate=no',
    'index=1'
  ]);

  // Flush command
  var flush = esc(['ipconfig', '/flushdns']);

  // Return
  return [config, flush];

};

/*
 * Helper command to build posix dns command
 */
var dnsCmdPosix = function(ip, data, postIp) {

  // Get the dnsFile
  var dnsFile = data.join(path.sep);

  // build the command
  return [
    'mkdir',
    '-p',
    data[0],
    '&&',
    'echo',
    '"nameserver ' + ip + postIp + '"',
    '>>',
    esc(dnsFile)
  ].join(' ');

};

/*
 * Helper command to build darwin dns command
 */
var dnsCmdDarwin = function(ip, data) {
  return dnsCmdPosix(ip, data, '');
};

/*
 * Helper command to build linux dns command
 */
var dnsCmdLinux = function(ip, data) {
  return dnsCmdPosix(ip, data, ':53');
};

/**
 * Returns a command to add DNS
 * @arg {string} ips - The ips to add
 * @arg {string} data - Other stuff
 */
exports.dnsCmd = function(ip, data) {

  // Return path based on platform
  switch (process.platform) {
    case 'win32': return dnsCmdWin32(ip, data);
    case 'darwin': return dnsCmdDarwin(ip, data);
    case 'linux': return dnsCmdLinux(ip, data);
  }

};
