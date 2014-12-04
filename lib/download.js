/**
  * @file
  */

'use strict';

var Download = require('download'),
  progress = require('download-status');

module.exports.downloadFiles = function (urls, dest, callback) {
  var download = new Download();
  urls.forEach(function (url) {
    download.get(url);
  });
  download.dest(dest).
  use(progress());

  download.run(callback);
};
