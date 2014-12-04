/**
  * @file
  */

'use strict';

var dns = require('dns');

module.exports.check = function (url, callback) {
  dns.resolve(url, function (err, data) {
    callback(err);
  });
};
