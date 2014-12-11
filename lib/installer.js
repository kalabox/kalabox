/**
  * @file
  */

'use strict';

var shell = require('./shell.js');

function buildCmd(pkg, targetVolume) {
  // Set resolver entries
  // var cmd = 'echo \'"nameserver 1.3.3.7"\' > /etc/resolver/kbox';
  var cmd = 'installer -verbose -pkg ' + pkg + ' -target ' + targetVolume;
  return cmd;
}

module.exports.installAsync = function(pkg, targetVolume) {
  //var cmd = 'installer -pkg ' + pkg + ' -target /Volumes/' + targetVolume;
  var cmd = buildCmd(pkg, targetVolume);
  return shell.execAdminAsync(cmd);
};

module.exports.install = function(pkg, targetVolume, callback) {
  //var cmd = 'installer -pkg ' + pkg + ' -target /Volumes/' + targetVolume;
  var cmd = buildCmd(pkg, targetVolume);
  shell.execAdmin(cmd, function(err, output) {
    callback(err, output);
  });
};
