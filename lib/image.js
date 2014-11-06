'use strict';

var fs = require('fs');
var path = require('path');

var config = require('./config.js');

var Docker = require('dockerode');
var docker =  new Docker(config.docker);

var exec = require('child_process').exec;

/**
 * Pull the image of a specific component.
 */
exports.pull = function(image, callback) {
  console.log('Pulling', image.name);
  docker.pull(image.name, function(err, stream) {
    if (err) {
      throw err;
    }
    var error = null
    stream.on('data', function(data) {
      // seems like this listener is required for this to work.
        data = JSON.parse(data.toString())
        for(var x in data){
          if(x.toLowerCase() == 'errordetail'){
            error = new Error(data[x].message)
            throw error
          }
        }
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

      var error = null

      stream.on('data', function(data) {
        // seems like this listener is required for this to work.
        data = JSON.parse(data.toString())
        for(var x in data){
          if(x.toLowerCase() == 'errordetail'){
            error = new Error(data[x].message)
            throw error
          }
        }
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
