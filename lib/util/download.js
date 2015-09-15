
'use strict';

var download = function(urls, dest, opts, callback) {
  // Moved these to inside the function so they will lazy load.
  var Download = require('download');
  var progress = require('download-status');
  var download = new Download(opts);

  urls.forEach(function(url) {
    download.get(url);
  });

  download.dest(dest).use(progress());
  download.run(callback);
};

exports.downloadFiles = function(urls, dest, callback) {
  download(urls, dest, {}, callback);
};

exports.downloadandExtractFiles = function(urls, dest, callback) {
  download(urls, dest, {extract: true}, callback);
};
