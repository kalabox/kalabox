/**
  * @file
  */

'use strict';

var Download = require('download');
var progress = require('download-status');
var download = new Download();

exports.downloadFiles = function(urls, dest, callback) {
  urls.forEach(function(url) {
    download.get(url);
  });

  download.dest(dest).use(progress());
  download.run(callback);
};
