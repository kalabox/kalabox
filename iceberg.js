'use strict';

var _ = require('lodash');
var fs = require('fs');
var krun = require('./krun.js');
var path = require('path');
var sha1 = require('sha1');
var randomstring = require('randomstring');

var remote = function(container, filepath) {

  var api = {};

  api.container = container;
  api.filepath = filepath;
  api.__isRemote = true;

  api.hash = function(cb) {

    var cmd = 'kbox query ' + api.container +
      ' sha1sum ' + api.filepath;

    krun().run(cmd).ok().call(function(done) {

      if (_.contains(this.output, 'No such file or directory')) {
        cb();
      } else {
        var sha1sum = _.head(this.output.split(' '));
        cb(sha1sum);
      }
      done();

    });

  };

  return api;

};

var local = function(filepath, cb) {

  var api = {
    filepath: filepath,
    __isLocal: true
  };

  api.exists = function(cb) {

    fs.exists(api.filepath, cb);

  };

  api.init = function(cb) {

    api.exists(function(exists) {

      if (exists) {
        return cb(new Error('File already exists: ' + api.filepath));    
      }

      var length = _.random(1024, 1024 * 64 * 10);
      var contents = randomstring.generate(length);

      fs.writeFile(api.filepath, contents, function(err) {
        cb(err);  
      });

    });

  };

  api.hash = function(cb) {

    fs.readFile(api.filepath, function(err, data) {

      if (err) {
        throw err;
      }

      cb(sha1(data));

    });

  };

  api.remove = function(cb) {

    fs.unlink(api.filepath, cb);

  };

  api.equal = function(remote, cb) {
    
    remote.hash(function(remoteHash) {

      api.hash(function(localHash) {

        console.log('remote -> ' + remoteHash);
        console.log('local  -> ' + localHash);

        var equal = remoteHash && remoteHash === localHash ? true : false;

        cb(equal);

      });

    });

  };

  api.toRemote = function(container, cb) {

    var filename = path.basename(api.filepath);
    var filepath = path.join('/data', filename);
    cb(null, remote(container, filepath));

  };

  api.exists(function(exists) {

    if (exists) {

      fs.stat(api.filepath, function(err, stats) {

        if(err) {
          return cb(err);
        }

        if (stats.isDirectory()) {
          var filename = randomstring.generate(9) + '.txt';
          var filepath = path.join(api.filepath, filename);
          api.filepath = filepath;
        }

        cb(null, api);

      });

    } else {

      cb(null, api);

    }

  });

};

module.exports = {
  local: local,
  remote: remote
};
