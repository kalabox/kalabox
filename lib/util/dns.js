/**
 * Module to help with some DNS things
 * @module kbox.util.dns
 */

'use strict';

// node modules
var path = require('path');

// npm modules
var _ = require('lodash');

// Kalabox modules
var shell = require('./shell.js');
var install = require('../install.js');
var Promise = require('../promise.js');

/*
 * Helper command to build win32 dns command
 */
var dnsCmdWin32 = function(ips, data) {
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

/*
 * Helper command to build darwin dns command
 */
var dnsCmdDarwin = function(ips, data) {
  var cmds = [];
  cmds.push(['mkdir -p', data[0]].join(' '));
  var dnsFile = data.join(path.sep);
  _.each(ips, function(ip) {
    cmds.push('echo \'"nameserver ' + ip + '"\' >> ' + dnsFile);
  });
  return cmds;
};

/*
 * Helper command to build linux dns command
 */
var dnsCmdLinux = function(ips, data) {
  var cmds = [];
  cmds.push(['mkdir -p', data[0]].join(' '));
  var dnsFile = data.join(path.sep);
  _.each(ips, function(ip) {
    cmds.push('echo \'"nameserver ' + ip + ':53"\' >> ' + dnsFile);
  });
  return cmds;
};

/**
 * Returns a command to add DNS
 * @arg {string} ips - The ips to add
 * @arg {string} data - Other stuff
 */
exports.dnsCmd = function(ips, data) {

  // Return path based on platform
  switch (process.platform) {
    case 'win32': return dnsCmdWin32(ips, data);
    case 'darwin': return dnsCmdDarwin(ips, data);
    case 'linux': return dnsCmdLinux(ips, data);
  }

};
