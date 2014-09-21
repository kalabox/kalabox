var fs = require('fs');
var path = require('path');
var config = require('../config.json');
var Docker = require('dockerode');
var docker =  new Docker(config.docker);

var baseDir = path.resolve(__dirname, '../');
var homePath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var dataPath = path.resolve(homePath, '.kalabox');
var appPath = path.resolve(dataPath, 'apps');

/**
 * Pull the image of a specific component.
 */
exports.pull = function(image, callback) {
  console.log('Pulling', image.name);
  docker.pull(image.name, function (err, stream) {
    if (err) {
      throw err;
    }
    stream.on('data', function(data) {
      // this is needed?
    });
    stream.on('end', function() {
      console.log(image.name, 'complete');
      callback();
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
  var exec = require('child_process').exec;
  exec('tar -cvf ' + file+ ' *', function (err, stdout, stderr) {
    if (err) {
      throw err;
    }

    var data = fs.createReadStream(file);
    docker.buildImage(data, {t: image.name}, function (err, stream){
      if (err) {
        throw err;
      }

      stream.on('data', function(data) {
        // this is needed?
      });

      stream.on('end', function() {
        fs.unlinkSync(file);
        process.chdir(baseDir);
        console.log(image.name, 'complete');
        callback();
      });
    });
  });
};