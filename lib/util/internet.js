/**
  * @file
  */

'use strict';

var dns = require('dns');

exports.check = function(url, callback) {
  dns.resolve(url, function(err, data) {
    callback(err);
  });
};
