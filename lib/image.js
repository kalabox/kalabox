'use strict';

var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var path = require('path');
var deps = require('./deps.js');

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
}

/**
 * Pull the image of a specific component.
 */
var pull = function(image, callback) {
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
exports.pull = pull;

/**
 * Takes an array of image ojects and their subcontainers
 */
var pullMany = function(images, callback) {
  async.eachSeries(images, function(image, nextEach) {
    async.series([

      function(next) {
        if (image.image) {
          pull(image, function(err) {
            if (err) {
              throw err;
            }
            next(null);
          });
        }
        else {
          next(null);
        }
      },

      function(next) {
        if (image.containers) {
          var containers = _.toArray(image.containers);
          console.log(containers);
          pullMany(containers, function() {
            next(null);
          });
        }
        else {
          next(null);
        }
      },

      ], function(err) {
      if (err) {
        throw err;
      }
      nextEach(null);
    });

  }, function(err) {
    if (err) {
      throw err;
    }
    callback();
  });
};
exports.pullMany = pullMany;

/**
 * Build the image of a specific component.
 */
exports.build = function(image, callback) {
  console.log('Building', image.name);
  var workingDir = path.dirname(image.src);
  var filename = 'archive.tar';
  var file = path.resolve(workingDir, filename);

  try {
    process.chdir(workingDir);
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
        deps.call(function(globalConfig) {
          process.chdir(globalConfig.srcRoot);
        });
        console.log(image.name, 'complete');
        callback(error, undefined);
      });
    });
  });
};
