/**
  * @file
  */

'use strict';

exports.downloadFiles = function(urls, dest, callback) {

  // Moved these to inside the function so they will lazy load.
  var Download = require('download');
  var progress = require('download-status');
  var download = new Download();

  urls.forEach(function(url) {
    download.get(url);
  });

  download.dest(dest).use(progress());
  download.run(callback);
};
