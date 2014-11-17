'use strict';

var fs = require('fs');
var path = require('path');

var config = require('./config.js');

var Docker = require('dockerode');
var docker =  new Docker(config.docker);

var exec = require('child_process').exec;

function parseDataAndReportErrors(data) {
  var parsedData;
  try {
    parsedData = JSON.parse(data.toString());
  } catch (err) {
    // do nothing
  }
  console.log(parsedData);
  if (parsedData) {
    for (var x in parsedData) {
      if (x.toLowerCase() === 'errordetail') {
        throw new Error(parsedData[x].message);
      }
    }
  }
};

/**
 * Pull the image of a specific component.
 */
exports.pull = function(image, callback) {
  console.log('Pulling', image.name);
  docker.pull(image.name, function(err, stream) {
    if (err) {
      throw err;
    }
    var error = null;
    stream.on('data', function(data) {
      // seems like this listener is required for this to work.
      parseDataAndReportErrors(data);
    });
    stream.on('end', function() {
      console.log(image.name, 'complete');
      callback(error, undefined);
    });
  });
};

/**
 * Build the image of a specific component.
 */
exports.build = function(image, callback) {
  console.log('Building', image.name);
  var filename = 'archive.tar';
  var file = path.resolve(image.src, filename);

  try {
    process.chdir(image.src);
  }
  catch (err) {
    throw err;
  }

  // Need a solution for windows
  // Maybe we can we pipe the directory with something like this:
  // process.stdin.pipe(zlib.createGunzip()).pipe(fs.createWriteStream(file));
  exec('tar -cvf ' + file + ' *', function(err, stdout, stderr) {
    if (err) {
      throw err;
    }

    var data = fs.createReadStream(file);
    docker.buildImage(data, {t: image.name}, function(err, stream) {
      if (err) {
        throw err;
      }

      var error = null;

      stream.on('data', function(data) {
        // seems like this listener is required for this to work.
        parseDataAndReportErrors(data);
      });

      stream.on('end', function() {
        fs.unlinkSync(file);
        process.chdir(config.baseDir);
        console.log(image.name, 'complete');
        callback(error, undefined);
      });
    });
  });
};
